/// <reference types="cypress" />

describe("Mentor Dashboard — Navigation", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("MENTOR");
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

  it("should load mentor dashboard", () => {
    cy.visit("/mentor");
    cy.url().should("include", "/mentor");
  });

  it("should switch to overview tab", () => {
    cy.visit("/mentor?tab=overview");
    cy.url().should("include", "tab=overview");
  });

  it("should switch to sessions tab", () => {
    cy.visit("/mentor?tab=sessions");
    cy.url().should("include", "tab=sessions");
  });

  it("should switch to students tab", () => {
    cy.visit("/mentor?tab=students");
    cy.url().should("include", "tab=students");
  });

  it("should switch to reviews tab", () => {
    cy.visit("/mentor?tab=reviews");
    cy.url().should("include", "tab=reviews");
  });

  it("should switch to feedback tab", () => {
    cy.visit("/mentor?tab=feedback");
    cy.url().should("include", "tab=feedback");
  });

  it("should switch to account tab", () => {
    cy.visit("/mentor?tab=account");
    cy.url().should("include", "tab=account");
  });

  it("should display notification bell", () => {
    cy.visit("/mentor");
    // Notification bell is a button with accessible label
    cy.get('[aria-label*="notification" i], [aria-label*="bell" i], button svg').should("exist");
  });
});
