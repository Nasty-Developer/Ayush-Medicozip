import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CheckoutAddressSection from "../src/components/customer/CheckoutAddressSection";
import type { CustomerAddress } from "../src/lib/addressService";

vi.mock("@/components/customer/AddressForm", () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div role="dialog" aria-label="New address form">
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("@/context/CustomerAuthContext", () => ({
  useCustomerAuth: () => ({ user: { uid: "checkout-test-user" } }),
}));

afterEach(cleanup);

const props = {
  addresses: [] as CustomerAddress[],
  onSelect: vi.fn(),
  onRetry: vi.fn(),
  loading: false,
  error: null,
};

describe("checkout address recovery", () => {
  it.each([
    ["empty address list", { loading: false, error: null }],
    ["address list loading", { loading: true, error: null }],
    ["address request failed", { loading: false, error: new Error("Network request failed") }],
  ])("keeps the add-address action available when %s", (_state, state) => {
    render(<CheckoutAddressSection {...props} {...state} />);

    const addButton = screen.getByRole("button", { name: "Add a new delivery address" });
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);
    expect(screen.getByRole("dialog", { name: "New address form" })).toBeTruthy();
  });

  it("offers retry with an actionable network error message", () => {
    const onRetry = vi.fn();
    render(
      <CheckoutAddressSection
        {...props}
        onRetry={onRetry}
        error={new Error("Network request failed")}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Check your connection");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
