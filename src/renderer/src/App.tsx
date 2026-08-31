import { useEffect, useMemo, useState } from 'react'
import {
  ConfigProvider,
  App as AntdApp,
  Layout,
  Card,
  Typography,
  Space,
  Form,
  InputNumber,
  Cascader,
  DatePicker,
  Input,
  Button,
  Select,
  Table,
  Row,
  Col
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AccountBookOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import CategoryManager from './components/CategoryManager'

const { Header, Content } = Layout
const { Title, Paragraph } = Typography
const { RangePicker } = DatePicker

interface CategoryTreeNode {
  id: number
  name: string
  icon: string | null
  children: CategoryTreeNode[]
}

interface ExpenseRecord {
  id: number
  amountCents: number
  date: string
  note: string | null
  categoryId: number
  subCategory: string
  topCategoryId: number
  topCategory: string
  topCategoryIcon: string | null
}

interface FormValues {
  amount: number
  category: (string | number)[]
  date: Dayjs
  note?: string
}

function App(): React.ReactElement {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#16a34a' } }}>
      <AntdApp>
        <MainLayout />
      </AntdApp>
    </ConfigProvider>
  )
}

function MainLayout(): React.ReactElement {
  const { message } = AntdApp.useApp()
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [topCategoryId, setTopCategoryId] = useState<number | undefined>(undefined)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const loadCategories = (): void => {
    window.api.getCategories().then(setCategories).catch((e) => console.error('读取分类失败：', e))
  }

  const loadExpenses = (): void => {
    window.api.getExpenses().then(setExpenses).catch((e) => console.error('读取账单失败：', e))
  }

  useEffect(() => {
    loadCategories()
    loadExpenses()
  }, [])

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: `${cat.icon ?? ''} ${cat.name}`,
        children: cat.children.map((child) => ({ value: child.id, label: child.name }))
      })),
    [categories]
  )

  const topCategoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat.id, label: `${cat.icon ?? ''} ${cat.name}` })),
    [categories]
  )

  // 根据筛选条件（日期范围、一级分类）过滤账单
  const filteredExpenses = useMemo(() => {
    let list = expenses
    if (dateRange) {
      const start = dateRange[0].format('YYYY-MM-DD')
      const end = dateRange[1].format('YYYY-MM-DD')
      list = list.filter((e) => e.date >= start && e.date <= end)
    }
    if (topCategoryId != null) {
      list = list.filter((e) => e.topCategoryId === topCategoryId)
    }
    return list
  }, [expenses, dateRange, topCategoryId])

  const totalYuan = useMemo(
    () => (filteredExpenses.reduce((sum, e) => sum + e.amountCents, 0) / 100).toFixed(2),
    [filteredExpenses]
  )

  const handleSubmit = async (values: FormValues): Promise<void> => {
    try {
      await window.api.addExpense({
        amount: values.amount,
        categoryId: Number(values.category[values.category.length - 1]),
        date: values.date.format('YYYY-MM-DD'),
        note: values.note
      })
      message.success('已记一笔 ✅')
      form.resetFields(['amount', 'note'])
      loadExpenses()
    } catch (error) {
      message.error('保存失败，请重试')
      console.error('保存花销失败：', error)
    }
  }

  const columns: ColumnsType<ExpenseRecord> = [
    { title: '日期', dataIndex: 'date', width: 120 },
    {
      title: '分类',
      render: (_, record) => `${record.topCategoryIcon ?? ''} ${record.topCategory} / ${record.subCategory}`
    },
    { title: '备注', dataIndex: 'note', render: (v: string | null) => v || '—' },
    {
      title: '金额（元）',
      dataIndex: 'amountCents',
      align: 'right',
      render: (v: number) => `￥${(v / 100).toFixed(2)}`
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#16a34a',
          paddingInline: 24
        }}
      >
        <Space size={12}>
          <AccountBookOutlined style={{ fontSize: 24, color: '#fff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            十一记账
          </Title>
        </Space>
        <Button icon={<SettingOutlined />} onClick={() => setCategoryModalOpen(true)}>
          分类管理
        </Button>
      </Header>

      <Content style={{ padding: 24 }}>
        <Card title="记一笔" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            onFinish={handleSubmit}
            initialValues={{ date: dayjs() }}
            labelCol={{ flex: '72px' }}
          >
            <Row gutter={24} align="top">
              <Col>
                <Form.Item name="amount" label="金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
                  <InputNumber min={0.01} precision={2} prefix="￥" style={{ width: 150 }} placeholder="0.00" />
                </Form.Item>
                <Form.Item name="note" label="备注">
                  <Input placeholder="选填" style={{ width: 150 }} allowClear />
                </Form.Item>
              </Col>

              <Col>
                <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
                  <Cascader options={categoryOptions} placeholder="请选择分类" style={{ width: 240 }} />
                </Form.Item>
              </Col>

              <Col>
                <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
                  <DatePicker />
                </Form.Item>
              </Col>

              <Col>
                <Form.Item label={<span />} colon={false}>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    保存
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card title="账单明细">
          <Space wrap style={{ marginBottom: 16 }}>
            <RangePicker
              onChange={(dates) =>
                setDateRange(dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null)
              }
            />
            <Select
              placeholder="全部分类"
              allowClear
              style={{ width: 180 }}
              options={topCategoryOptions}
              value={topCategoryId}
              onChange={(v) => setTopCategoryId(v)}
            />
          </Space>

          <Paragraph type="secondary">
            共 {filteredExpenses.length} 笔，合计 ￥{totalYuan}
          </Paragraph>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredExpenses}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: '暂无记录，先记一笔吧' }}
          />
        </Card>
      </Content>

      <CategoryManager
        open={categoryModalOpen}
        categories={categories}
        onClose={() => setCategoryModalOpen(false)}
        onChanged={() => {
          loadCategories()
          loadExpenses()
        }}
      />
    </Layout>
  )
}

export default App
