// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { streakMoment } from "./shareMoments";

vi.mock("../../utils/useAuth", () => ({ useAuth: () => ({ firstName: "Yehuda" }) }));
vi.mock("html-to-image", () => ({ toBlob: async () => new Blob(["x"], { type: "image/png" }) }));

const { ShareSheet } = await import("./ShareSheet");

afterEach(cleanup);

describe("share sheet", () => {
  it("copies the status text the moment it opens, and says so — no Copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareSheet moment={streakMoment(30)} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("✓ STATUS TEXT · COPIED")).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(
      "וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה\nThirty days of daily Mishna.\nCome join me in our daily learning — chazarashashas.org",
    );
    expect(screen.queryByRole("button", { name: /^copy$/i })).toBeNull();
  });

  it("shows the card, then the toggles, then the four targets in order", () => {
    render(<ShareSheet moment={streakMoment(30)} onClose={() => {}} />);
    expect(screen.getByText("This is what goes out. Your name is not on it unless you add it.")).toBeTruthy();
    expect(screen.getByText("days of daily limmud")).toBeTruthy();
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels.filter((l) => /WhatsApp|Save the image|More…|Copy link/.test(l ?? "")).map((l) => l!.replace(/image \+ text|1080 × 1080|native sheet|chazarashashas\.org/, ""))).toEqual([
      "WhatsApp",
      "Save the image",
      "More…",
      "Copy link",
    ]);
  });

  it("keeps the name off the card until asked, and can drop the figure", () => {
    render(<ShareSheet moment={streakMoment(30)} onClose={() => {}} />);
    expect(screen.queryByText(/Yehuda/)).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Include my name/ }));
    expect(screen.getByText(/Yehuda/)).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Include the figure/ }));
    expect(screen.queryByText("30")).toBeNull();
  });
});
