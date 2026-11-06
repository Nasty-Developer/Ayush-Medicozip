import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CheckoutAddressSection from "../src/components/customer/CheckoutAddressSection";
import { ApiResponseError } from "../src/lib/apiAuth";
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

  it("offers sign-in again when a token-related error shows the refresh message", () => {
    render(
      <CheckoutAddressSection
        {...props}
        error={new ApiResponseError("Token verification failed", 500)}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Your sign-in needs to be refreshed");
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeTruthy();
  });

  it("does not offer sign-in again when Firebase Admin is unavailable", () => {
    render(
      <CheckoutAddressSection
        {...props}
        error={new ApiResponseError("Authentication service is not configured", 503, "firebase_admin_not_configured")}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Secure sign-in is not available");
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
  });

  it("reports a server-side outage as unavailable, not as a connection problem", () => {
    // This is the production failure shape: the API answers 500 with
    // "Failed to fetch addresses" when its database is suspended. The word
    // "fetch" in that body must not be mistaken for a network error.
    render(
      <CheckoutAddressSection
        {...props}
        error={new ApiResponseError("Failed to fetch addresses", 500)}
      />,
    );

    const alert = screen.getByRole("alert").textContent ?? "";
    expect(alert).toContain("temporarily unavailable");
    expect(alert).not.toContain("Check your connection");
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
  });

  it("explains a database outage reported as 503", () => {
    render(
      <CheckoutAddressSection
        {...props}
        error={
          new ApiResponseError(
            "The address service is temporarily unavailable, so it could not load your saved addresses. Please retry in a moment.",
            503,
            "database_unavailable",
          )
        }
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("temporarily unavailable");
  });

  it("still shows the connection message for a real transport failure", () => {
    render(
      <CheckoutAddressSection
        {...props}
        error={new TypeError("Failed to fetch")}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Check your connection");
  });

  it("shows the timeout message when loading takes too long", () => {
    render(
      <CheckoutAddressSection
        {...props}
        error={new Error("Saved addresses took too long to load. Please try again.")}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("taking longer than usual");
  });
});
