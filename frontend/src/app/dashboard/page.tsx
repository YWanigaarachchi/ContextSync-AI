"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { AnalyticsDashboard, apiGetDashboard } from "@/lib/api";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      apiGetDashboard()
        .then(setData)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated]);

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="bg-radial">
      <Navbar />
      <main style={styles.main}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header} className="animate-fadeInDown">
            <h1 style={styles.title}>
              📊 <span className="gradient-text">Analytics Dashboard</span>
            </h1>
            <p style={styles.subtitle}>
              Monitor your knowledge base usage and performance
            </p>
          </div>

          {isLoading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} className="animate-spin" />
              <p style={styles.loadingText}>Loading analytics...</p>
            </div>
          ) : data ? (
            <>
              {/* Stats Cards */}
              <div style={styles.statsGrid} className="animate-fadeInUp">
                <StatCard
                  icon="📄"
                  label="Documents"
                  value={data.overview.total_documents}
                  color="var(--accent-primary)"
                />
                <StatCard
                  icon="💬"
                  label="Queries"
                  value={data.overview.total_queries}
                  color="var(--success)"
                />
                <StatCard
                  icon="🗣️"
                  label="Conversations"
                  value={data.overview.total_conversations}
                  color="var(--warning)"
                />
                <StatCard
                  icon="⚡"
                  label="Avg Response"
                  value={
                    data.overview.avg_response_time_ms
                      ? `${(data.overview.avg_response_time_ms / 1000).toFixed(1)}s`
                      : "—"
                  }
                  color="var(--info)"
                />
              </div>

              {/* Charts Row */}
              <div style={styles.chartsRow}>
                {/* Usage Chart */}
                <div style={styles.chartCard} className="card animate-fadeInUp delay-2">
                  <h3 style={styles.chartTitle}>📈 Daily Usage (Last 30 days)</h3>
                  {data.daily_usage.length === 0 ? (
                    <p style={styles.noData}>No usage data yet</p>
                  ) : (
                    <div style={styles.barChart}>
                      {data.daily_usage.slice(-14).map((day, i) => {
                        const maxVal = Math.max(
                          ...data.daily_usage.map((d) => d.query_count + d.upload_count),
                          1
                        );
                        const height = ((day.query_count + day.upload_count) / maxVal) * 120;
                        return (
                          <div key={i} style={styles.barContainer}>
                            <div style={styles.barWrapper}>
                              <div
                                style={{
                                  ...styles.bar,
                                  height: `${Math.max(height, 4)}px`,
                                }}
                                title={`Queries: ${day.query_count}, Uploads: ${day.upload_count}`}
                              />
                            </div>
                            <span style={styles.barLabel}>
                              {day.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Documents */}
                <div style={styles.chartCard} className="card animate-fadeInUp delay-3">
                  <h3 style={styles.chartTitle}>🏆 Top Referenced Documents</h3>
                  {data.top_documents.length === 0 ? (
                    <p style={styles.noData}>No references yet</p>
                  ) : (
                    <div style={styles.topDocList}>
                      {data.top_documents.slice(0, 5).map((doc, i) => (
                        <div key={i} style={styles.topDocItem}>
                          <span style={styles.topDocRank}>#{i + 1}</span>
                          <span style={styles.topDocName}>{doc.document_name}</span>
                          <span style={styles.topDocCount}>
                            {doc.reference_count} refs
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div style={styles.activitySection} className="card animate-fadeInUp delay-4">
                <h3 style={styles.chartTitle}>🕐 Recent Activity</h3>
                {data.recent_activity.length === 0 ? (
                  <p style={styles.noData}>No activity yet</p>
                ) : (
                  <div style={styles.activityList}>
                    {data.recent_activity.slice(0, 10).map((activity, i) => (
                      <div key={i} style={styles.activityItem}>
                        <span style={styles.activityIcon}>
                          {activity.event_type === "query"
                            ? "💬"
                            : activity.event_type === "upload"
                            ? "📄"
                            : activity.event_type === "login"
                            ? "🔑"
                            : "📌"}
                        </span>
                        <span style={styles.activityDesc}>
                          {activity.description}
                        </span>
                        <span style={styles.activityTime}>
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p style={styles.noData}>Failed to load analytics data</p>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div style={styles.statCard} className="card">
      <div style={styles.statHeader}>
        <span style={styles.statIcon}>{icon}</span>
        <span style={styles.statLabel}>{label}</span>
      </div>
      <span style={{ ...styles.statValue, color }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    paddingTop: "var(--navbar-height)",
    minHeight: "100vh",
  },
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "var(--text-secondary)",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "16px",
    paddingTop: "80px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border-color)",
    borderTopColor: "var(--accent-primary)",
    borderRadius: "50%",
  },
  loadingText: {
    fontSize: "14px",
    color: "var(--text-secondary)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  statHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statIcon: {
    fontSize: "20px",
  },
  statLabel: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },
  statValue: {
    fontSize: "32px",
    fontWeight: 800,
    letterSpacing: "-1px",
  },
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: "16px",
    marginBottom: "24px",
  },
  chartCard: {
    padding: "24px",
  },
  chartTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "20px",
  },
  noData: {
    fontSize: "14px",
    color: "var(--text-muted)",
    textAlign: "center" as const,
    padding: "24px",
  },
  barChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: "6px",
    height: "150px",
    paddingTop: "10px",
  },
  barContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "6px",
  },
  barWrapper: {
    flex: 1,
    display: "flex",
    alignItems: "flex-end",
    width: "100%",
  },
  bar: {
    width: "100%",
    background: "var(--accent-gradient)",
    borderRadius: "4px 4px 0 0",
    transition: "height 500ms ease",
    minHeight: "4px",
  },
  barLabel: {
    fontSize: "9px",
    color: "var(--text-muted)",
    whiteSpace: "nowrap" as const,
  },
  topDocList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  topDocItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "var(--radius-sm)",
    background: "rgba(99, 102, 241, 0.03)",
  },
  topDocRank: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--accent-secondary)",
    minWidth: "24px",
  },
  topDocName: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  topDocCount: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  activitySection: {
    padding: "24px",
  },
  activityList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 8px",
    borderRadius: "var(--radius-sm)",
    borderBottom: "1px solid var(--border-color)",
  },
  activityIcon: {
    fontSize: "16px",
    flexShrink: 0,
  },
  activityDesc: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text-primary)",
  },
  activityTime: {
    fontSize: "11px",
    color: "var(--text-muted)",
    whiteSpace: "nowrap" as const,
  },
};
