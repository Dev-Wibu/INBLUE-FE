/// <reference types="cypress" />

describe("Admin Dashboard — User Management", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.login("ADMIN");
    cy.interceptCommonAPIs();
    cy.intercept("GET", "**/api/users*", {
      statusCode: 200,
      body: {
        traceId: "mock",
        data: [
          { id: 1, email: "nha36978@gmail.com", fullName: "Bình An", role: "USER" },
          { id: 2, email: "thuson@gmail.com", fullName: "Thùy Sơn", role: "ADMIN" },
          { id: 3, email: "b@fpt.com", fullName: "Mentor B", role: "MENTOR" },
        ],
      },
    }).as("getUsers");
    cy.intercept("GET", "**/api/**", {
      statusCode: 200,
      body: { traceId: "mock", data: [] },
    });
  });

  it("should display user table", () => {
    cy.visit("/admin?tab=users");
    cy.wait("@getUsers");
    cy.contains(/Bình An|nha36978@gmail.com|user/i).should("exist");
  });
});
