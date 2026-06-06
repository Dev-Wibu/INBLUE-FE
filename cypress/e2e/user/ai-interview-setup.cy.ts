/// <reference types="cypress" />

describe("User Dashboard — AI Interview Setup", () => {
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

  it("should load the setup page", () => {
    cy.visit("/user/ai-interview/setup");
    cy.url().should("include", "/ai-interview/setup");
  });

  it("should display job role selection", () => {
    cy.visit("/user/ai-interview/setup");
    cy.get("input, select, [role='combobox']").should("exist");
  });
});
