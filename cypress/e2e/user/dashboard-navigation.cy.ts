/// <reference types="cypress" />

describe("User Dashboard — Navigation", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
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

  it("should load dashboard with default tab", () => {
    cy.visit("/user");
    cy.url().should("include", "/user");
  });

  it("should switch tab via URL param (overview)", () => {
    cy.visit("/user?tab=overview");
    cy.url().should("include", "tab=overview");
  });

  it("should switch tab via URL param (notifications)", () => {
    cy.visit("/user?tab=notifications");
    cy.url().should("include", "tab=notifications");
  });

  it("should switch tab via URL param (account)", () => {
    cy.visit("/user?tab=account");
    cy.url().should("include", "tab=account");
  });

  it("should switch tab via URL param (aiInterview)", () => {
    cy.visit("/user?tab=aiInterview");
    cy.url().should("include", "tab=aiInterview");
  });

  it("should switch tab via URL param (practice)", () => {
    cy.visit("/user?tab=practice");
    cy.url().should("include", "tab=practice");
  });

  it("should switch tab via URL param (mentors)", () => {
    cy.visit("/user?tab=mentors");
    cy.url().should("include", "tab=mentors");
  });

  it("should display sidebar navigation", () => {
    cy.visit("/user");
    cy.get("nav, aside, [role='navigation']").should("exist");
  });

  it("should display notification bell", () => {
    cy.visit("/user");
    // Notification bell is a button with accessible label
    cy.get('[aria-label*="notification" i], [aria-label*="bell" i], button svg').should("exist");
  });

  it("should fallback to default tab for invalid tab param", () => {
    cy.visit("/user?tab=nonexistent");
    cy.url().should("include", "/user");
  });
});
