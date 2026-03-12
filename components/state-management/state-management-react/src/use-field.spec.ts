import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "./use-field";

function renderUseField<T>(field: Field<T>) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const result: {
    current: [T, (value: T) => void] | null;
  } = {
    current: null,
  };

  function HookHost(props: { boundField: Field<T> }) {
    result.current = useField(props.boundField);
    return null;
  }

  function render(boundField: Field<T>) {
    act(() => {
      ReactDOM.render(React.createElement(HookHost, { boundField }), container);
    });
  }

  render(field);

  return {
    result,
    rerender(nextField: Field<T>) {
      render(nextField);
    },
    unmount() {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
      container.remove();
    },
  };
}

describe("useField", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the current field value and reacts to field updates", () => {
    const field = new Field("initial");
    const rendered = renderUseField(field);

    expect(rendered.result.current?.[0]).toBe("initial");

    act(() => {
      field.value = "from-ui";
    });

    expect(rendered.result.current?.[0]).toBe("from-ui");
    rendered.unmount();
  });

  it("setter requests a field update and the rendered value stays in sync", () => {
    const onUpdateRequested = vi.fn();
    const field = new Field("old", onUpdateRequested);
    const rendered = renderUseField(field);

    act(() => {
      rendered.result.current?.[1]("new");
    });

    expect(field.value).toBe("new");
    expect(onUpdateRequested).toHaveBeenCalledWith("new", "old");
    expect(rendered.result.current?.[0]).toBe("new");
    rendered.unmount();
  });

  it("supports multiple hook instances for the same field", () => {
    const field = new Field("initial");
    const first = renderUseField(field);
    const second = renderUseField(field);

    act(() => {
      field.requestUpdate("updated");
    });

    expect(first.result.current?.[0]).toBe("updated");
    expect(second.result.current?.[0]).toBe("updated");

    first.unmount();

    act(() => {
      field.requestUpdate("after-first-unmount");
    });

    expect(second.result.current?.[0]).toBe("after-first-unmount");
    expect(field.updateUI).not.toBeNull();
    second.unmount();
    expect(field.updateUI).toBeNull();
  });

  it("moves the subscription when the field reference changes", () => {
    const firstField = new Field("first");
    const secondField = new Field("second");
    const rendered = renderUseField(firstField);

    rendered.rerender(secondField);

    expect(firstField.updateUI).toBeNull();
    expect(secondField.updateUI).not.toBeNull();

    act(() => {
      secondField.requestUpdate("updated");
    });

    expect(rendered.result.current?.[0]).toBe("updated");
    rendered.unmount();
  });
});