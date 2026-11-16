import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable";

interface Row { id: number; nom: string }
const rows: Row[] = [{ id: 2, nom: "Sarra" }, { id: 1, nom: "Amine" }, { id: 3, nom: "Karim" }];
const columns: Column<Row>[] = [
  { key: "id", header: "N°", cell: (r) => r.id, sortValue: (r) => r.id },
  { key: "nom", header: "Nom", cell: (r) => r.nom, sortValue: (r) => r.nom },
];

const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1]!.textContent);

describe("DataTable", () => {
  it("sorts by a column and toggles direction", async () => {
    render(<DataTable caption="Donneurs" rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const header = screen.getByRole("button", { name: "Nom" });
    await userEvent.click(header);
    expect(names()).toEqual(["Amine", "Karim", "Sarra"]);
    expect(screen.getByRole("columnheader", { name: "Nom" })).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(header);
    expect(names()).toEqual(["Sarra", "Karim", "Amine"]);
  });

  it("opens a row with the keyboard", async () => {
    const onRowClick = vi.fn();
    render(<DataTable caption="Donneurs" rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={onRowClick} rowLabel={(r) => r.nom} />);
    screen.getByRole("row", { name: "Amine" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("shows the empty state when there are no rows", () => {
    render(<DataTable caption="Donneurs" rows={[]} columns={columns} rowKey={(r) => r.id} empty={<p>Aucun donneur</p>} />);
    expect(screen.getByText("Aucun donneur")).toBeInTheDocument();
  });
});
