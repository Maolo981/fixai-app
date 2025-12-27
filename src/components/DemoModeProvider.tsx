import React, { createContext, useContext, useState, ReactNode } from "react";

interface DemoJob {
  id: string;
  status: string;
  diagnosis: {
    problem_type: string;
    ai_analysis: string;
    urgency_level: string;
    estimated_cost_min: number;
    estimated_cost_max: number;
  };
  technician: {
    full_name: string;
    avatar_url: string | null;
    phone: string;
    rating: number;
    specialties: string[];
  };
  client: {
    full_name: string;
    phone: string;
    address: string;
    email: string;
  };
  confirmed_slot: {
    date: string;
    start_time: string;
    end_time: string;
    label: string;
  };
  estimated_duration: number;
  final_cost: number;
}

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoJob: DemoJob;
  demoStatus: string;
  setDemoStatus: (status: string) => void;
  advanceStatus: () => void;
}

const DEMO_JOB: DemoJob = {
  id: "demo-job-001",
  status: "confirmed",
  diagnosis: {
    problem_type: "Guasto caldaia",
    ai_analysis: "Probabile problema alla valvola di sicurezza o al pressostato. Necessaria ispezione e possibile sostituzione componenti.",
    urgency_level: "medium",
    estimated_cost_min: 80,
    estimated_cost_max: 150,
  },
  technician: {
    full_name: "Marco Rossi",
    avatar_url: null,
    phone: "+39 333 1234567",
    rating: 4.8,
    specialties: ["Idraulica", "Caldaie", "Climatizzazione"],
  },
  client: {
    full_name: "Anna Bianchi",
    phone: "+39 347 9876543",
    address: "Via Roma 42, 20100 Milano",
    email: "anna.bianchi@email.com",
  },
  confirmed_slot: {
    date: new Date().toISOString().split('T')[0],
    start_time: "10:00",
    end_time: "12:00",
    label: "Oggi 10:00 - 12:00",
  },
  estimated_duration: 2,
  final_cost: 120,
};

const STATUS_FLOW = [
  "pending",
  "confirmed", 
  "en_route",
  "in_progress",
  "completed",
];

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStatus, setDemoStatus] = useState("confirmed");

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (!isDemoMode) {
      setDemoStatus("confirmed");
    }
  };

  const advanceStatus = () => {
    const currentIndex = STATUS_FLOW.indexOf(demoStatus);
    if (currentIndex < STATUS_FLOW.length - 1) {
      setDemoStatus(STATUS_FLOW[currentIndex + 1]);
    }
  };

  const demoJob = {
    ...DEMO_JOB,
    status: demoStatus,
  };

  return (
    <DemoModeContext.Provider value={{
      isDemoMode,
      toggleDemoMode,
      demoJob,
      demoStatus,
      setDemoStatus,
      advanceStatus,
    }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
