import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { createSeededMock } from "./services/seed";

describe("App with demo data", () => {
  it("renders today's summary and opens the need form with N", async () => {
    window.location.hash = "#/";
    render(<App api={await createSeededMock(0)} />);
    expect(await screen.findByRole("heading", { level: 1, name: /attend(ent)? des donneurs/ })).toBeInTheDocument();
    expect(await screen.findByText("Donneurs prévenus")).toBeInTheDocument();
    await userEvent.keyboard("n");
    expect(await screen.findByRole("dialog", { name: "Déclarer un besoin urgent" })).toBeInTheDocument();
  });
});
