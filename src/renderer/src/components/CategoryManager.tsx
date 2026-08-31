import { useState } from 'react'
import { Modal, Button, Input, Space, Popconfirm, Empty, App as AntdApp, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface CategoryTreeNode {
  id: number
  name: string
  icon: string | null
  children: CategoryTreeNode[]
}

interface RenameState {
  id: number
  title: string
}

interface Props {
  open: boolean
  categories: CategoryTreeNode[]
  onClose: () => void
  onChanged: () => void
}

function CategoryManager({ open, categories, onClose, onChanged }: Props): React.ReactElement {
  const { message } = AntdApp.useApp()
  const [renameState, setRenameState] = useState<RenameState | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newTopName, setNewTopName] = useState('')
  const [subInputs, setSubInputs] = useState<Record<number, string>>({})

  const openRename = (id: number, title: string, current: string): void => {
    setRenameState({ id, title })
    setRenameValue(current)
  }

  const addTop = async (): Promise<void> => {
    const name = newTopName.trim()
    if (!name) {
      message.warning('请输入大类名称')
      return
    }
    try {
      await window.api.addCategory(null, name)
      message.success('已添加')
      setNewTopName('')
      onChanged()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加失败')
    }
  }

  const addSub = async (parentId: number): Promise<void> => {
    const name = (subInputs[parentId] ?? '').trim()
    if (!name) {
      message.warning('请输入小类名称')
      return
    }
    try {
      await window.api.addCategory(parentId, name)
      message.success('已添加')
      setSubInputs((s) => ({ ...s, [parentId]: '' }))
      onChanged()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加失败')
    }
  }

  const confirmRename = async (): Promise<void> => {
    if (!renameState) return
    const name = renameValue.trim()
    if (!name) {
      message.warning('名称不能为空')
      return
    }
    try {
      await window.api.renameCategory(renameState.id, name)
      message.success('已重命名')
      setRenameState(null)
      onChanged()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重命名失败')
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      await window.api.deleteCategory(id)
      message.success('已删除')
      onChanged()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  return (
    <>
      <Modal title="分类管理" open={open} onCancel={onClose} footer={null} width={680}>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="输入一级大类名称，如「宠物」"
            value={newTopName}
            onChange={(e) => setNewTopName(e.target.value)}
            onPressEnter={addTop}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={addTop}>
            添加大类
          </Button>
        </Space.Compact>

        {categories.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text strong>
                  {cat.icon ?? ''} {cat.name}
                </Typography.Text>
                <Space size={0}>
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openRename(cat.id, '重命名大类', cat.name)}
                  />
                  <Popconfirm
                    title="确定删除该大类？"
                    description="需先删除其下所有小类"
                    onConfirm={() => handleDelete(cat.id)}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>

              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cat.children.map((child) => (
                  <span
                    key={child.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: '2px 8px',
                      background: '#f5f5f5',
                      borderRadius: 4
                    }}
                  >
                    <span>{child.name}</span>
                    <Button
                      size="small"
                      type="text"
                      style={{ padding: 0, width: 20 }}
                      icon={<EditOutlined style={{ fontSize: 12 }} />}
                      onClick={() => openRename(child.id, '重命名小类', child.name)}
                    />
                    <Popconfirm title="确定删除该小类？" onConfirm={() => handleDelete(child.id)}>
                      <Button
                        size="small"
                        type="text"
                        danger
                        style={{ padding: 0, width: 20 }}
                        icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                      />
                    </Popconfirm>
                  </span>
                ))}
              </div>

              <Space.Compact style={{ marginTop: 8, width: 260 }}>
                <Input
                  size="small"
                  placeholder="添加小类"
                  value={subInputs[cat.id] ?? ''}
                  onChange={(e) => setSubInputs((s) => ({ ...s, [cat.id]: e.target.value }))}
                  onPressEnter={() => addSub(cat.id)}
                />
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addSub(cat.id)}>
                  添加
                </Button>
              </Space.Compact>
            </div>
          ))
        )}
      </Modal>

      <Modal
        title={renameState?.title}
        open={renameState != null}
        onOk={confirmRename}
        onCancel={() => setRenameState(null)}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <Input
          placeholder="分类名称"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={confirmRename}
          autoFocus
        />
      </Modal>
    </>
  )
}

export default CategoryManager
