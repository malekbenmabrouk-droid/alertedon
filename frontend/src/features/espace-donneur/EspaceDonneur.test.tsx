import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../App";
import { createSeededMock } from "../../services/seed";

describe("donor space (UC1 and UC4 belong to the Donneur actor)", () => {
  beforeEach(() => sessionStorage.clear());

  it("lets a person register and lands on their own space", async () => {
    window.location.hash = "#/donneur/inscription";
    render(<App api={await createSeededMock(0)} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Nom et prénom"), "Nadia Selmi");
    await user.click(screen.getByRole("radio", { name: "B+" }));
    await user.type(screen.getByLabelText("Téléphone"), "+216 55 123 456");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "M'inscrire comme donneur" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Bonjour Nadia/ })).toBeInTheDocument();
    expect(screen.getByText(/Merci, vous êtes inscrit/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Voir l'espace de/ })).not.toBeInTheDocument();
  });

  it("refuses registration without consent", async () => {
    window.location.hash = "#/donneur/inscription";
    render(<App api={await createSeededMock(0)} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "M'inscrire comme donneur" }));
    expect(await screen.findByText("Votre accord est nécessaire pour être prévenu.")).toBeInTheDocument();
  });

  it("gives the same answer for an unknown contact", async () => {
    window.location.hash = "#/donneur/connexion";
    render(<App api={await createSeededMock(0)} />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Téléphone ou e-mail"), "+216 99 999 999");
    await user.click(screen.getByRole("button", { name: "Ouvrir mon espace" }));
    expect(await screen.findByText(/Aucun espace ne correspond/)).toBeInTheDocument();
  });
});

describe("centre registry", () => {
  it("is read-only and masks contacts", async () => {
    window.location.hash = "#/donneurs";
    render(<App api={await createSeededMock(0)} />);
    const table = await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /Inscrire/ })).not.toBeInTheDocument();
    expect(within(table).queryByText("+216 20 100 400")).not.toBeInTheDocument();
    expect(within(table).getAllByText(/^•• •• \d{3}$/).length).toBeGreaterThan(0);
  });
});
