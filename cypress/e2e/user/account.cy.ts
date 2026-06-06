/// <reference types="cypress" />

describe("User Dashboard — Account", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
  });

  it("should display account page", () => {
    cy.visit("/user?tab=account");
    cy.url().should("include", "tab=account");
  });

  it("should display user info", () => {
    cy.visit("/user?tab=account");
    cy.contains(/Bình An|binhan@gmail.com/i).should("exist");
  });
});
