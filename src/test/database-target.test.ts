import { describe, expect, it } from "vitest";
import { familyRequestUrl } from "@/lib/database-target";

describe("External data preservation", () => {
  it.each(["members", "candidates", "votes", "settings"])("isolates %s from existing external data", (table) => {
    expect(familyRequestUrl(`https://example.com/rest/v1/${table}?select=id`, true))
      .toBe(`https://example.com/rest/v1/bakri_${table}?select=id`);
  });
  it("keeps the managed database unchanged", () => {
    expect(familyRequestUrl("https://example.com/rest/v1/members", false))
      .toBe("https://example.com/rest/v1/members");
  });
  it("does not redirect unrelated external tables", () => {
    expect(familyRequestUrl("https://example.com/rest/v1/profiles", true))
      .toBe("https://example.com/rest/v1/profiles");
  });
});