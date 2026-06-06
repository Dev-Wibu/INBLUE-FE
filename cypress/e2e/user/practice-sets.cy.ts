/// <reference types="cypress" />

describe("User Dashboard — Practice Sets", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/practice-sets*", {
      fixture: "api/practice-sets-list.json",
    }).as("getPracticeSets");
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
  });

  it("should display practice sets", () => {
    cy.visit("/user?tab=practice");
    cy.wait("@getPracticeSets");
    cy.contains(/practice|luyện tập|JavaScript|System Design/i).should("exist");
  });
});
