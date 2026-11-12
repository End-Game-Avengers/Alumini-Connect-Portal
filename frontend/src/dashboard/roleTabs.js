export const tabLabels = {
  overview: "Overview",
  directory: "Alumni directory",
  connections: "Connections",
  mentorship: "Mentorship",
  opportunities: "Opportunities",
  events: "Events",
  announcements: "Announcements",
  resources: "Learning resources",
  people: "People",
  manage: "Management",
  profile: "My profile"
};

export function getTabs(role) {
  if (role === "student") return ["overview", "directory", "connections", "mentorship", "opportunities", "events", "announcements", "resources", "profile"];
  if (role === "alumni") return ["overview", "directory", "people", "connections", "mentorship", "opportunities", "events", "announcements", "resources", "profile"];
  if (role === "faculty") return ["overview", "people", "mentorship", "opportunities", "events", "announcements", "resources", "profile"];
  if (role === "hod") return ["overview", "people", "mentorship", "opportunities", "events", "announcements", "resources", "manage", "profile"];
  return ["overview", "people", "directory", "connections", "mentorship", "opportunities", "events", "announcements", "resources", "manage", "profile"];
}
