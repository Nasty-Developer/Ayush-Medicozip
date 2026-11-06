import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AddressList from "../src/components/customer/AddressList";
import type { CustomerAddress } from "../src/lib/addressService";

const savedAddress: CustomerAddress = {
  id: "77",
  fullName: "Ayush Customer",
  mobileNumber: "9876543210",
  houseNumber: "4B",
  buildingName: "Sunrise Apartments",
  street: "LBS Marg",
  area: "Kurla West",
  landmark: "Near SBI ATM",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400070",
  addressType: "home",
  isDefault: false,
};

// The real form posts to /api/addresses; here it just reports the address the
// API would return, so the list's own selection behaviour can be asserted.
vi.mock("@/components/customer/AddressForm", () => ({
  default: ({ onSuccess }: { onSuccess: (id: string, address?: CustomerAddress) => void }) => (
    <div>
      <p>New address form</p>
      <button type="button" onClick={() => onSuccess(savedAddress.id, savedAddress)}>
        Save address
      </button>
    </div>
  ),
}));

vi.mock("@/context/CustomerAuthContext", () => ({
  useCustomerAuth: () => ({ user: { uid: "checkout-test-user" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

afterEach(cleanup);

describe("checkout add-address flow", () => {
  it("opens the address form from an empty list", () => {
    render(
      <AddressList addresses={[]} onSelect={vi.fn()} showControls allowDelete={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add a new delivery address" }));
    expect(screen.getByText("New address form")).toBeTruthy();
  });

  it("selects the newly saved address so checkout can continue", () => {
    const onSelect = vi.fn();
    render(
      <AddressList addresses={[]} onSelect={onSelect} showControls allowDelete={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add a new delivery address" }));
    fireEvent.click(screen.getByRole("button", { name: "Save address" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(savedAddress);
    // Returning to the list is how the customer sees the refreshed addresses.
    expect(screen.queryByText("New address form")).toBeNull();
  });

  it("lets a customer pick between saved addresses", () => {
    const second: CustomerAddress = { ...savedAddress, id: "78", addressType: "work", isDefault: true };
    const onSelect = vi.fn();
    render(
      <AddressList
        addresses={[savedAddress, second]}
        selectedId={savedAddress.id}
        onSelect={onSelect}
        showControls
        allowDelete={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select work address for Ayush Customer" }));
    expect(onSelect).toHaveBeenCalledWith(second);
  });
});
