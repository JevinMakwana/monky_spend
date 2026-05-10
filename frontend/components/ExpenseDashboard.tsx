"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, LeftOutlined, MinusOutlined, PlusOutlined, ReloadOutlined, RightOutlined } from "@ant-design/icons";
import {
  addExpense,
  addWishItem,
  adjustWishItemSavedAmount,
  deleteExpense,
  getMonthlyExpenses,
  getWishItems
} from "../lib/api";
import {
  expenseCategories,
  expenseCategoryLabels,
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
  type WishItem,
  isWishAllocatedEntry,
  isWishWithdrawalEntry,
  extractWishItemName
} from "../lib/types";

dayjs.extend(utc);

const { Title, Text } = Typography;
const currentMonthKey = () => dayjs().format("YYYY-MM");

const categoryOptions = expenseCategories.map((category) => ({
  label: expenseCategoryLabels[category],
  value: category
}));

type ExpenseFormValues = {
  itemName: string;
  category: ExpenseCategory;
  amount: number;
  date: dayjs.Dayjs;
};

type WishFormValues = {
  itemName: string;
  targetAmount: number;
  monthlyCommitment: number;
};

function sumByCategory(expenses: Expense[]): ExpenseSummary[] {
  return expenseCategories.map((category) => ({
    category,
    total: expenses
      .filter((expense) => expense.category === category)
      .reduce((total, expense) => total + expense.amount, 0)
  }));
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export default function ExpenseDashboard() {
  const [form] = Form.useForm<ExpenseFormValues>();
  const [wishForm] = Form.useForm<WishFormValues>();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [wishItems, setWishItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWish, setSavingWish] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [wishAdjustAmounts, setWishAdjustAmounts] = useState<Record<string, number>>({});
  const [adjustingWishId, setAdjustingWishId] = useState<string | null>(null);

  const selectedMonthLabel = dayjs(`${selectedMonth}-01`).format("MMMM YYYY");
  const currentMonthTotals = useMemo(() => sumByCategory(expenses), [expenses]);
  const totalSpent = useMemo(() => {
    return expenses.reduce((total, expense) => {
      // Income/withdrawal entries reduce the total
      if (expense.category === "income") {
        return total - expense.amount;
      }
      // Regular expenses add to total
      return total + expense.amount;
    }, 0);
  }, [expenses]);

  async function loadData(month: string) {
    setLoading(true);
    try {
      const [monthExpenses, wishes] = await Promise.all([
        getMonthlyExpenses(month),
        getWishItems()
      ]);
      setExpenses(monthExpenses);
      setWishItems(wishes);
      setWishAdjustAmounts((prev) => {
        const next: Record<string, number> = {};
        wishes.forEach((item) => {
          next[item._id] = prev[item._id] ?? item.monthlyCommitment;
        });
        return next;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load expenses";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(selectedMonth);
  }, [selectedMonth]);

  async function handleSubmit(values: ExpenseFormValues) {
    setSaving(true);
    try {
      await addExpense({
        itemName: values.itemName.trim(),
        category: values.category,
        amount: values.amount,
        date: values.date.format("YYYY-MM-DD")
      });
      message.success("Expense saved");
      form.resetFields([
        "itemName",
        "amount",
        "category",
        "date"
      ]);
      form.setFieldsValue({
        category: "essential-food",
        date: dayjs()
      });
      await loadData(selectedMonth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save expense";
      message.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleWishSubmit(values: WishFormValues) {
    setSavingWish(true);
    try {
      await addWishItem({
        itemName: values.itemName.trim(),
        targetAmount: values.targetAmount,
        monthlyCommitment: values.monthlyCommitment
      });
      message.success("Wish item saved");
      wishForm.resetFields(["itemName", "targetAmount", "monthlyCommitment"]);
      await loadData(selectedMonth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save wish item";
      message.error(errorMessage);
    } finally {
      setSavingWish(false);
    }
  }

  async function handleDeleteExpense(expenseId: string, expense: Expense) {
    setDeletingExpenseId(expenseId);
    try {
      const wishName = extractWishItemName(expense);
      if (wishName) {
        // This is a wish-related entry; reverse the wish changes
        const wishItem = wishItems.find((w) => w.itemName === wishName);
        if (wishItem) {
          if (isWishAllocatedEntry(expense.itemName)) {
            // Allocated entry: subtract from wish saved amount
            await adjustWishItemSavedAmount(wishItem._id, -expense.amount);
          } else if (isWishWithdrawalEntry(expense.itemName)) {
            // Withdrawal entry: add back to wish saved amount
            await adjustWishItemSavedAmount(wishItem._id, expense.amount);
          }
        }
      }

      await deleteExpense(expenseId);
      message.success("Expense deleted");
      await loadData(selectedMonth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete expense";
      message.error(errorMessage);
    } finally {
      setDeletingExpenseId(null);
    }
  }

  function renderWishCards() {
    if (wishItems.length === 0) {
      return (
        <Alert
          style={{ marginTop: 12 }}
          message="No wish items yet"
          description="Add your first wish item and start tracking monthly contributions."
          type="info"
          showIcon
        />
      );
    }

    return (
      <div className="wish-strip" style={{ marginTop: 12 }}>
        {wishItems.map((item) => {
          const progressPercent =
            item.targetAmount > 0
              ? Math.min(100, Math.round((item.savedAmount / item.targetAmount) * 100))
              : 0;

          return (
            <Card key={item._id} variant="borderless" className="wish-card">
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                <div>
                  <Text strong>{item.itemName}</Text>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <Text type="secondary">Saved / Target</Text>
                  <Text strong>
                    {currency(item.savedAmount)} / {currency(item.targetAmount)}
                  </Text>
                </div>

                <Progress percent={progressPercent} showInfo={false} />

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <Text type="secondary">Remaining</Text>
                  <Text strong>{currency(item.remainingAmount)}</Text>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <Text type="secondary">Monthly commitment</Text>
                  <Text>{currency(item.monthlyCommitment)}</Text>
                </div>

                <Space.Compact style={{ width: "100%", display: "flex" }}>
                  <Button
                    icon={<MinusOutlined />}
                    loading={adjustingWishId === item._id}
                    onClick={() => void handleAdjustWishAmount(item, -1)}
                    style={{ flex: "0 0 auto" }}
                  />
                  <InputNumber
                    min={1}
                    step={1}
                    value={wishAdjustAmounts[item._id]}
                    onChange={(value) => {
                      if (!value) {
                        return;
                      }
                      setWishAdjustAmounts((prev) => ({
                        ...prev,
                        [item._id]: Number(value)
                      }));
                    }}
                    style={{ flex: 1, textAlign: "center" }}
                    placeholder="Amount"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={adjustingWishId === item._id}
                    onClick={() => void handleAdjustWishAmount(item, 1)}
                    style={{ flex: "0 0 auto" }}
                  />
                </Space.Compact>
              </Space>
            </Card>
          );
        })}
      </div>
    );
  }

  async function handleAdjustWishAmount(item: WishItem, direction: 1 | -1) {
    const enteredAmount = Number(wishAdjustAmounts[item._id] ?? item.monthlyCommitment);
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      message.error("Enter a valid amount greater than 0");
      return;
    }

    setAdjustingWishId(item._id);
    try {
      if (direction === 1) {
        // Add: create allocation entry in "other-extra" category (increases total)
        await addExpense({
          itemName: `Allocated to: ${item.itemName}`,
          category: "other-extra",
          amount: enteredAmount,
          date: dayjs().format("YYYY-MM-DD")
        });
        message.success("Allocation saved");
      } else {
        // Subtract: create withdrawal entry in "income" category (decreases total)
        await addExpense({
          itemName: `Withdrawn from: ${item.itemName}`,
          category: "income",
          amount: enteredAmount,
          date: dayjs().format("YYYY-MM-DD")
        });
        message.success("Withdrawal recorded");
      }

      // Always adjust the wish item saved amount
      const updated = await adjustWishItemSavedAmount(item._id, enteredAmount * direction);
      setWishItems((current) => current.map((entry) => (entry._id === updated._id ? updated : entry)));

      // Reload expenses to show the new entry
      await loadData(selectedMonth);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update wish item";
      message.error(errorMessage);
    } finally {
      setAdjustingWishId(null);
    }
  }

  const columns: ColumnsType<Expense> = [
    {
      title: "Date",
      dataIndex: "date",
      render: (value: string) => dayjs.utc(value).format("DD MMM YYYY")
    },
    {
      title: "Item",
      dataIndex: "itemName"
    },
    {
      title: "Category",
      dataIndex: "category",
      render: (value: ExpenseCategory) => <Tag color="geekblue">{expenseCategoryLabels[value]}</Tag>
    },
    {
      title: "Amount",
      dataIndex: "amount",
      align: "right",
      render: (value: number, record: Expense) => {
        const isAllocated = isWishAllocatedEntry(record.itemName);
        const isWithdrawal = isWishWithdrawalEntry(record.itemName);
        const isIncome = record.category === "income";
        const color = isWithdrawal || isIncome ? "#52c41a" : undefined;
        return (
          <Text strong style={{ color }}>
            {isIncome ? "-" : ""}{currency(value)}
          </Text>
        );
      }
    },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_value, record) => (
        <Popconfirm
          title="Delete this expense?"
          description="This action cannot be undone."
          okText="Delete"
          okButtonProps={{ danger: true, loading: deletingExpenseId === record._id }}
          onConfirm={() => void handleDeleteExpense(record._id, record)}
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            Delete
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <main>
      <div className="app-shell">
        <section className="hero">
          <div className="hero-grid hero-grid--stacked">
            {/* Row 1: Selected month totals */}
            <div className="hero-row hero-row--summary">
              <div>
                <Card variant="borderless" className="selected-total-card" style={{ borderRadius: 24 }}>
                  <Statistic title="Selected month total" value={currency(totalSpent)} />
                  <Text type="secondary">{selectedMonthLabel}</Text>
                </Card>
              </div>

              <div className="hero-category-block">
                <div className="hero-category-heading">
                  <div>
                    <Title level={4} style={{ "marginBottom": "0", color: "#fff" }}>
                      Selected month category expenses
                    </Title>
                  </div>
                </div>

                <div className="category-strip" style={{ marginTop: 12 }}>
                  {currentMonthTotals.map((summary) => (
                    <Card key={summary.category} className="category-card" variant="borderless">
                      <div className="summary-label">{expenseCategoryLabels[summary.category]}</div>
                      <div className="summary-value">{currency(summary.total)}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Input forms */}
            <div className="hero-row hero-row--forms">
              <div>
                <div className="hero-form-block">
                  <div className="hero-form-label">Add expense</div>
                  <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ category: "essential-food", date: dayjs() }}>
                    <Row gutter={12}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          // label="Item name"
                          name="itemName"
                          rules={[{ required: true, message: "Please enter an item name" }]}
                        >
                          <Input placeholder="Item name" size="large" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item
                          // label="Category"
                          name="category"
                          rules={[{ required: true, message: "Please choose a category" }]}
                        >
                          <Select size="large" options={categoryOptions} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          // label="Amount"
                          name="amount"
                          rules={[{ required: true, message: "Amount" }]}
                        >
                          <InputNumber min={0} step={1} size="large" style={{ width: "100%" }} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          // label="Date"
                          name="date"
                          rules={[{ required: true, message: "Please choose a date" }]}
                        >
                          <DatePicker size="large" style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={2} style={{ display: "flex", alignItems: "end" }}>
                        <Form.Item style={{ width: "100%" }}>
                          <Button type="primary" htmlType="submit" size="large" block loading={saving}>
                            Save
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </div>

              <div>
                <div className="hero-form-block hero-form-block--wish">
                  <div className="hero-form-label">Add wish item</div>
                  <Form form={wishForm} layout="vertical" onFinish={handleWishSubmit}>
                    <Row gutter={12}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          // label="Wish item"
                          name="itemName"
                          rules={[{ required: true, message: "Please enter the item name" }]}
                        >
                          <Input placeholder="Item name" size="large" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item
                          // label="Target price"
                          name="targetAmount"
                          rules={[{ required: true, message: "Please enter the target price" }]}
                        >
                          <InputNumber min={0} step={1} size="large" style={{ width: "100%" }} placeholder="Target price" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item
                          // label="Monthly commitment"
                          name="monthlyCommitment"
                          rules={[{ required: true, message: "Please enter monthly commitment" }]}
                        >
                          <InputNumber min={0} step={1} size="large" style={{ width: "100%" }} placeholder="saving/month" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4} style={{ display: "flex", alignItems: "end" }}>
                        <Form.Item style={{ width: "100%" }}>
                          <Button type="primary" htmlType="submit" size="large" block loading={savingWish}>
                            Add wish
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                Wish items
              </Title>
              <p>Your active wish items and progress.</p>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>{renderWishCards()}</div>
        </section>
        <section className="panel">
          <div className="toolbar">
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {selectedMonthLabel}
              </Title>
              <Text className="current-month">Current month view and history navigation</Text>
            </div>
            <Space wrap className="toolbar-actions">
              <Button icon={<LeftOutlined />} onClick={() => setSelectedMonth(dayjs(`${selectedMonth}-01`).subtract(1, "month").format("YYYY-MM"))}>
                Previous
              </Button>
              <DatePicker
                picker="month"
                value={dayjs(`${selectedMonth}-01`)}
                allowClear={false}
                onChange={(value) => value && setSelectedMonth(value.format("YYYY-MM"))}
              />
              <Button icon={<RightOutlined />} onClick={() => setSelectedMonth(dayjs(`${selectedMonth}-01`).add(1, "month").format("YYYY-MM"))}>
                Next
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void loadData(selectedMonth)}>
                Refresh
              </Button>
            </Space>
          </div>

          {loading ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 260 }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div className="table-shell" style={{ marginTop: 18 }}>
                <Table<Expense>
                  rowKey="_id"
                  columns={columns}
                  dataSource={expenses}
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: "No expenses found for this month" }}
                />
              </div>
            </>
          )}
        </section>

        
      </div>
    </main>
  );
}
