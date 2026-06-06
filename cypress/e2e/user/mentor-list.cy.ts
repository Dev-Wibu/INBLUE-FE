/// <reference types="cypress" />

describe("User Dashboard — Mentor List", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/mentors*", {
      fixture: "api/mentors-list.json",
    }).as("getMentors");
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
  });

  it("should display mentor cards", () => {
    cy.visit("/user?tab=mentors");
    cy.wait("@getMentors");
    // Check that mentor content is visible
    cy.contains(/mentor/i).should("exist");
  });

  it("should display mentor info in cards", () => {
    cy.visit("/user?tab=mentors");
    cy.wait("@getMentors");
    cy.contains(/Mentor B|Mentor C/i).should("exist");
  });
});
