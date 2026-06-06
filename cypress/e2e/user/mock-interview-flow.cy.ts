/// <reference types="cypress" />

describe("User Dashboard — Mock Interview Flow", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/mentors*", {
      fixture: "api/mentors-list.json",
    }).as("getMentors");
    cy.intercept("GET", "**/api/sessions/**", {
      fixture: "api/sessions-list.json",
    }).as("getSession");
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
    cy.intercept("POST", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: {} },
    });
  });

  it("should load mentor selection page", () => {
    cy.visit("/user/mock-interview/select-mentor");
    cy.wait("@getMentors");
    cy.url().should("include", "/select-mentor");
  });

  it("should load schedule page", () => {
    cy.visit("/user/mock-interview/schedule");
    cy.url().should("include", "/schedule");
  });

  it("should load booking success page", () => {
    cy.visit("/user/mock-interview/booking-success");
    cy.url().should("include", "/booking-success");
  });

  it("should load session detail page", () => {
    cy.visit("/user/mock-interview/history/101");
    cy.wait("@getSession");
    cy.url().should("include", "/history/101");
  });
});
