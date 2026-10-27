import { describe, expect, it } from "vitest";
import { elderRepeatCount, resolveParents } from "@/lib/family-tree";

const father = { id: "father", full_name: "رائد محمد عبد الرحمن البكري", father_name: "محمد عبد الرحمن البكري" };
// Compound names count as words; use the user's four-part/three-part example separately.
const dad = { id: "dad", full_name: "رائد محمد أحمد البكري", father_name: "محمد أحمد البكري" };
const son = { id: "son", full_name: "أمير رائد محمد البكري", father_name: "رائد محمد البكري" };

describe("family links", () => {
  it("links a three-part father name to a unique four-part name", () => {
    expect(resolveParents([dad, son]).get("son")).toBe("dad");
  });
  it("handles عبد الرحمن as a compound name in the existing family", () => {
    expect(resolveParents([father, son]).get("son")).toBe("father");
  });
  it("groups siblings beneath their shared father", () => {
    const brother = { ...son, id: "brother", full_name: "عمر رائد محمد البكري" };
    const links = resolveParents([dad, son, brother]);
    expect([links.get("son"), links.get("brother")]).toEqual(["dad", "dad"]);
  });
  it("links a father and his brother to their grandfather added later", () => {
    const grand = { id: "grand", full_name: "محمد أحمد البكري", father_name: null };
    const uncle = { ...dad, id: "uncle", full_name: "خالد محمد أحمد البكري" };
    const links = resolveParents([son, dad, uncle, grand]);
    expect([links.get("dad"), links.get("uncle")]).toEqual(["grand", "grand"]);
  });
  it("does not guess between two shortened-name matches", () => {
    expect(resolveParents([dad, { ...dad, id: "other", full_name: "رائد محمد علي البكري" }, son]).get("son")).toBeNull();
  });
  it("prefers a unique exact name over shortened matches", () => {
    expect(resolveParents([dad, { ...dad, id: "exact", full_name: son.father_name }, son]).get("son")).toBe("exact");
  });
  it("does not link to a pending father", () => {
    expect(resolveParents([{ ...dad, status: "pending" }, son]).get("son")).toBeNull();
  });
  it("removes circular links", () => {
    expect([...resolveParents([{ id: "a", full_name: "أحمد", father_name: "محمد" }, { id: "b", full_name: "محمد", father_name: "أحمد" }]).values()]).toEqual([null, null]);
  });
});

describe("continuous elders", () => {
  it("repeats three elders enough to fill a wide screen", () => {
    expect(elderRepeatCount(3, 1920) * 3 * 172).toBeGreaterThanOrEqual(1920);
  });
  it("adapts automatically to six elders", () => {
    expect(elderRepeatCount(6, 1280)).toBe(2);
  });
  it("keeps fewer than three elders static", () => {
    expect(elderRepeatCount(2, 1920)).toBe(1);
  });
});