"use client";

import { unstableSetRender } from "antd";
import { createRoot, type Root } from "react-dom/client";

const roots = new WeakMap<Element | DocumentFragment, Root>();

unstableSetRender((node, container) => {
  const root = roots.get(container) ?? createRoot(container);

  if (!roots.has(container)) {
    roots.set(container, root);
  }

  root.render(node);

  return async () => {
    root.unmount();
    roots.delete(container);
  };
});

export default function AntdCompatibility() {
  return null;
}