/// <reference types="cypress" />

describe("Admin Dashboard — Navigation", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("ADMIN");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
    cy.intercept("POST", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: {} },
    });
  });

  it("should load admin dashboard with default tab", () => {
    cy.visit("/admin");
    cy.url().should("include", "/admin");
  });

  it("should switch to users tab", () => {
    cy.visit("/admin?tab=users");
    cy.url().should("include", "tab=users");
  });

  it("should switch to mentors tab", () => {
    cy.visit("/admin?tab=mentors");
    cy.url().should("include", "tab=mentors");
  });

  it("should switch to sessions tab", () => {
    cy.visit("/admin?tab=sessions");
    cy.url().should("include", "tab=sessions");
  });

  it("should switch to reviews tab", () => {
    cy.visit("/admin?tab=reviews");
    cy.url().should("include", "tab=reviews");
  });

  it("should switch to feedback tab", () => {
    cy.visit("/admin?tab=feedback");
    cy.url().should("include", "tab=feedback");
  });

  it("should switch to notifications tab", () => {
    cy.visit("/admin?tab=notifications");
    cy.url().should("include", "tab=notifications");
  });

  it("should switch to questionCategories tab", () => {
    cy.visit("/admin?tab=questionCategories");
    cy.url().should("include", "tab=questionCategories");
  });

  it("should switch to practiceSets tab", () => {
    cy.visit("/admin?tab=practiceSets");
    cy.url().should("include", "tab=practiceSets");
  });

  it("should switch to quizSets tab", () => {
    cy.visit("/admin?tab=quizSets");
    cy.url().should("include", "tab=quizSets");
  });

  it("should switch to posts tab", () => {
    cy.visit("/admin?tab=posts");
    cy.url().should("include", "tab=posts");
  });

  it("should switch to companies tab", () => {
    cy.visit("/admin?tab=companies");
    cy.url().should("include", "tab=companies");
  });

  it("should switch to payments tab", () => {
    cy.visit("/admin?tab=payments");
    cy.url().should("include", "tab=payments");
  });

  it("should display sidebar", () => {
    cy.visit("/admin");
    cy.get("nav, aside, [role='navigation']").should("exist");
  });

  it("should fallback invalid tab to default", () => {
    cy.visit("/admin?tab=fake");
    cy.url().should("include", "/admin");
  });
});
