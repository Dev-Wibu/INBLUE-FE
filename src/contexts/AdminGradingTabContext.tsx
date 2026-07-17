import { createContext, useContext } from "react";

interface AdminGradingTabContextValue {
  openGradingTab: (_appId: number, _extra?: { candidateName?: string; jdId?: string }) => void;
}

const AdminGradingTabContext = createContext<AdminGradingTabContextValue>({
  openGradingTab: () => {},
});

export function AdminGradingTabProvider({
  children,
  openGradingTab,
}: {
  children: React.ReactNode;
  openGradingTab: (_appId: number, _extra?: { candidateName?: string; jdId?: string }) => void;
}) {
  return (
    <AdminGradingTabContext.Provider value={{ openGradingTab }}>
      {children}
    </AdminGradingTabContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOpenGradingTab() {
  return useContext(AdminGradingTabContext);
}
