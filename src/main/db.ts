import initSqlJs from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

// 分类树节点（返回给界面使用的结构）
export interface CategoryTreeNode {
  id: number
  name: string
  icon: string | null
  children: CategoryTreeNode[]
}

let db: initSqlJs.Database | null = null

function getDb(): initSqlJs.Database {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

function dbPath(): string {
  // 数据库文件保存在系统应用数据目录（如 Windows 的 AppData），
  // 重启电脑后数据仍在
  return join(app.getPath('userData'), 'shiyi-jizhang.db')
}

// 预置的分类体系：一级大类 + 二级小类
const TOP_LEVEL_CATEGORIES = [
  { name: '餐饮', icon: '🍜', children: ['早餐', '午餐', '晚餐', '外卖', '零食饮料', '咖啡奶茶', '聚餐请客'] },
  { name: '交通出行', icon: '🚗', children: ['公交地铁', '出租车/网约车', '火车高铁', '飞机', '加油', '停车费', '共享单车'] },
  { name: '购物消费', icon: '🛍️', children: ['服饰鞋包', '日用百货', '数码家电', '美妆护肤', '书籍文具'] },
  { name: '居住生活', icon: '🏠', children: ['房租', '水电燃气', '物业费', '宽带网络', '家居装修'] },
  { name: '娱乐休闲', icon: '🎮', children: ['电影演出', '游戏', '运动健身', '旅游度假', '会员订阅'] },
  { name: '医疗健康', icon: '💊', children: ['门诊就医', '药品', '体检', '口腔牙科'] },
  { name: '学习教育', icon: '📚', children: ['学费', '培训课程', '书籍资料', '考试报名'] },
  { name: '人情往来', icon: '🎁', children: ['礼物红包', '孝敬长辈', '请客随礼'] },
  { name: '通讯网络', icon: '📱', children: ['手机话费', '流量充值'] },
  { name: '其他', icon: '📦', children: ['其他'] }
]

// 初始化数据库：加载（或新建）数据库文件、建表、首次运行时写入预置分类
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs()
  const file = dbPath()
  db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database()
  createTables()
  seedCategories()
  saveToDisk()
}

function createTables(): void {
  const d = getDb()
  d.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `)
  d.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_cents INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    )
  `)
}

function seedCategories(): void {
  const d = getDb()
  const result = d.exec('SELECT COUNT(*) AS c FROM categories')
  const count = Number(result[0]?.values?.[0]?.[0] ?? 0)
  if (count > 0) return // 已经初始化过，跳过

  d.run('BEGIN')
  try {
    TOP_LEVEL_CATEGORIES.forEach((top, topIndex) => {
      d.run('INSERT INTO categories (parent_id, name, icon, sort_order) VALUES (?, ?, ?, ?)', [
        null,
        top.name,
        top.icon,
        topIndex
      ])
      const topId = Number(d.exec('SELECT last_insert_rowid() AS id')[0].values[0][0])
      top.children.forEach((childName, childIndex) => {
        d.run('INSERT INTO categories (parent_id, name, icon, sort_order) VALUES (?, ?, ?, ?)', [
          topId,
          childName,
          null,
          childIndex
        ])
      })
    })
    d.run('COMMIT')
  } catch (error) {
    d.run('ROLLBACK')
    throw error
  }
}

// 把内存中的数据库写回磁盘文件
function saveToDisk(): void {
  const d = getDb()
  fs.writeFileSync(dbPath(), Buffer.from(d.export()))
}

// 查询所有分类，返回「一级大类 + 二级小类」的嵌套结构
export function getCategories(): CategoryTreeNode[] {
  const d = getDb()
  const result = d.exec('SELECT id, parent_id, name, icon FROM categories ORDER BY sort_order, id')
  if (result.length === 0) return []

  const rows = result[0].values.map((row) => ({
    id: Number(row[0]),
    parent_id: row[1] == null ? null : Number(row[1]),
    name: String(row[2]),
    icon: row[3] == null ? null : String(row[3])
  }))

  const nodeMap = new Map<number, CategoryTreeNode>()
  const tree: CategoryTreeNode[] = []

  rows.forEach((r) => nodeMap.set(r.id, { id: r.id, name: r.name, icon: r.icon, children: [] }))

  rows.forEach((r) => {
    const node = nodeMap.get(r.id)
    if (!node) return
    if (r.parent_id == null) {
      tree.push(node)
    } else {
      nodeMap.get(r.parent_id)?.children.push(node)
    }
  })

  return tree
}

// 记一笔花销的输入参数
export interface ExpenseInput {
  amount: number // 金额（元）
  categoryId: number // 二级小类 id
  date: string // 日期，格式 YYYY-MM-DD
  note?: string // 备注（可选）
}

// 新增一笔花销，返回新记录的 id
export function addExpense(input: ExpenseInput): number {
  const d = getDb()
  // 金额以「分」为单位存储（整数），避免小数运算误差
  const amountCents = Math.round(input.amount * 100)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error('金额无效')
  }
  d.run(
    'INSERT INTO expenses (amount_cents, category_id, date, note, created_at) VALUES (?, ?, ?, ?, ?)',
    [amountCents, input.categoryId, input.date, input.note ?? null, new Date().toISOString()]
  )
  saveToDisk()
  return Number(d.exec('SELECT last_insert_rowid() AS id')[0].values[0][0])
}

// 账单记录（含分类信息）
export interface ExpenseRecord {
  id: number
  amountCents: number
  date: string
  note: string | null
  categoryId: number // 二级小类 id
  subCategory: string // 二级小类名
  topCategoryId: number // 一级大类 id
  topCategory: string // 一级大类名
  topCategoryIcon: string | null
}

// 查询所有花销记录，按日期倒序（最新的在前）
export function getExpenses(): ExpenseRecord[] {
  const d = getDb()
  const result = d.exec(`
    SELECT e.id, e.amount_cents, e.date, e.note,
           c.id, c.name, p.id, p.name, p.icon
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY e.date DESC, e.id DESC
  `)
  if (result.length === 0) return []
  return result[0].values.map((row) => ({
    id: Number(row[0]),
    amountCents: Number(row[1]),
    date: String(row[2]),
    note: row[3] == null ? null : String(row[3]),
    categoryId: Number(row[4]),
    subCategory: String(row[5]),
    topCategoryId: Number(row[6]),
    topCategory: String(row[7]),
    topCategoryIcon: row[8] == null ? null : String(row[8])
  }))
}

// 查询某分类下有多少个二级小类
function countChildren(parentId: number): number {
  const d = getDb()
  const stmt = d.prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ?')
  stmt.bind([parentId])
  stmt.step()
  const count = Number(stmt.get()[0])
  stmt.free()
  return count
}

// 查询某分类下有多少条账单
function countExpensesForCategory(categoryId: number): number {
  const d = getDb()
  const stmt = d.prepare('SELECT COUNT(*) AS c FROM expenses WHERE category_id = ?')
  stmt.bind([categoryId])
  stmt.step()
  const count = Number(stmt.get()[0])
  stmt.free()
  return count
}

// 添加分类：parentId 为 null 表示一级大类，否则为二级小类
export function addCategory(parentId: number | null, name: string, icon: string | null = null): number {
  const d = getDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名称不能为空')

  // 检查同级是否已存在同名分类
  const dupSql =
    parentId == null
      ? 'SELECT COUNT(*) AS c FROM categories WHERE parent_id IS NULL AND name = ?'
      : 'SELECT COUNT(*) AS c FROM categories WHERE parent_id = ? AND name = ?'
  const dupParams = parentId == null ? [trimmed] : [parentId, trimmed]
  const dupStmt = d.prepare(dupSql)
  dupStmt.bind(dupParams)
  dupStmt.step()
  const dupCount = Number(dupStmt.get()[0])
  dupStmt.free()
  if (dupCount > 0) throw new Error('已存在同名分类')

  d.run('INSERT INTO categories (parent_id, name, icon, sort_order) VALUES (?, ?, ?, 0)', [
    parentId,
    trimmed,
    icon
  ])
  saveToDisk()
  return Number(d.exec('SELECT last_insert_rowid() AS id')[0].values[0][0])
}

// 重命名分类
export function renameCategory(id: number, name: string): void {
  const d = getDb()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名称不能为空')
  d.run('UPDATE categories SET name = ? WHERE id = ?', [trimmed, id])
  saveToDisk()
}

// 删除分类（有保护：还有小类、或已有账单时不允许删除）
export function deleteCategory(id: number): void {
  const d = getDb()
  if (countChildren(id) > 0) {
    throw new Error('该大类下还有小类，请先删除所有小类')
  }
  if (countExpensesForCategory(id) > 0) {
    throw new Error('该分类下已有账单记录，无法删除')
  }
  d.run('DELETE FROM categories WHERE id = ?', [id])
  saveToDisk()
}
