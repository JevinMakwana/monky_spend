"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Space, Spin, Typography, message } from "antd";
import ExpenseDashboard from "./ExpenseDashboard";
import {
  clearAuthSession,
  getCurrentUser,
  getStoredAuthSession,
  login,
  saveAuthSession,
  signup
} from "../lib/api";
import type { AuthSession } from "../lib/types";

const { Title, Text } = Typography;

type AuthMode = "login" | "signup";

type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

export default function AuthGate() {
  const [form] = Form.useForm<AuthFormValues>();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const storedSession = getStoredAuthSession();
      if (!storedSession) {
        setCheckingSession(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        const nextSession = {
          ...storedSession,
          user
        };
        saveAuthSession(nextSession);
        setSession(nextSession);
      } catch {
        clearAuthSession();
        setSession(null);
      } finally {
        setCheckingSession(false);
      }
    }

    void restoreSession();
  }, []);

  async function handleFinish(values: AuthFormValues) {
    setSubmitting(true);
    try {
      const trimmedEmail = values.email.trim();

      const nextSession =
        authMode === "signup"
          ? await signup({
              name: values.name?.trim() ?? "",
              email: trimmedEmail,
              password: values.password
            })
          : await login({
              email: trimmedEmail,
              password: values.password
            });

      saveAuthSession(nextSession);
      setSession(nextSession);
      message.success(authMode === "signup" ? "Account created" : "Signed in successfully");
      form.resetFields();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSignOut() {
    clearAuthSession();
    setSession(null);
    setAuthMode("login");
    form.resetFields();
    message.success("Signed out");
  }

  if (checkingSession) {
    return (
      <main className="auth-shell">
        <div className="auth-loading">
          <Spin size="large" />
          <Text type="secondary">Restoring your session</Text>
        </div>
      </main>
    );
  }

  if (session) {
    return (
      <>
        <div className="session-bar">
          <Space wrap>
            <Text strong>{session.user.name}</Text>
            <Text type="secondary">{session.user.email}</Text>
          </Space>
          <Button onClick={handleSignOut}>Sign out</Button>
        </div>
        <ExpenseDashboard />
      </>
    );
  }

  return (
    <main className="auth-shell">
      <Card className="auth-card" variant="borderless">
        <div className="auth-badge">Secure account access</div>
        <Title level={1} style={{ marginTop: 0, marginBottom: 12 }}>
          Track expenses with your own account.
        </Title>
        <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
          Sign up to create a private ledger, or log in to continue where you left off.
        </Text>

        <Form<AuthFormValues> layout="vertical" form={form} onFinish={handleFinish}>
          {authMode === "signup" ? (
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter your name" }]}
            >
              <Input placeholder="Your name" size="large" autoComplete="name" />
            </Form.Item>
          ) : null}

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Enter a valid email address" }
            ]}
          >
            <Input placeholder="name@example.com" size="large" autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please enter a password" },
              { min: 8, message: "Use at least 8 characters" }
            ]}
          >
            <Input.Password
              placeholder="Create a password"
              size="large"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
            />
          </Form.Item>

          {authMode === "signup" ? (
            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error("Passwords do not match"));
                  }
                })
              ]}
            >
              <Input.Password placeholder="Confirm your password" size="large" autoComplete="new-password" />
            </Form.Item>
          ) : null}

          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            {authMode === "signup" ? "Create account" : "Log in"}
          </Button>
        </Form>

        <div style={{ marginTop: 18 }}>
          <Text type="secondary">
            {authMode === "signup" ? "Already have an account?" : "Need a new account?"}
          </Text>{" "}
          <Button
            type="link"
            style={{ paddingInline: 0 }}
            onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
          >
            {authMode === "signup" ? "Log in" : "Sign up"}
          </Button>
        </div>
      </Card>
    </main>
  );
}