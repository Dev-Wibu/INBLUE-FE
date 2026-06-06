/// <reference types="cypress" />

describe("Staff Dashboard — Navigation", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("STAFF");
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

  it("should load staff dashboard", () => {
    cy.visit("/staff");
    cy.url().should("include", "/staff");
  });

  it("should access mentor applications", () => {
    cy.visit("/staff/mentor-applications");
    cy.url().should("include", "/mentor-applications");
  });

  it("should access review moderation", () => {
    cy.visit("/staff/reviews");
    cy.url().should("include", "/reviews");
  });

  it("should access feedback moderation", () => {
    cy.visit("/staff/feedback");
    cy.url().should("include", "/feedback");
  });

  it("should access post moderation", () => {
    cy.visit("/staff/posts");
    cy.url().should("include", "/posts");
  });

  it("should access sessions", () => {
    cy.visit("/staff/sessions");
    cy.url().should("include", "/sessions");
  });
});
