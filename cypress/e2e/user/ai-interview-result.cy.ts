/// <reference types="cypress" />

describe("User Dashboard — AI Interview Result", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("USER");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/interview-sessions/**", {
      statusCode: 200,
      body: {
        traceId: "mock",
        data: {
          id: 1,
          status: "COMPLETED",
          score: 85,
          feedback: "Good performance overall",
        },
      },
    }).as("getInterviewResult");
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
  });

  it("should load result page with mock data", () => {
    cy.visit("/user/ai-interview/result/1");
    cy.wait("@getInterviewResult");
    cy.url().should("include", "/ai-interview/result/1");
  });
});
