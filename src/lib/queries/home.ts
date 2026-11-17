import { db } from "../data/store";
import type { Profile } from "../data/types";
import { isWithin } from "../format";
import { scopeForRole } from "../rbac";

export type HomeData = {
  villages: { id: string; name: string; block: string }[];
  addedThisWeek: number;
  activitiesThisWeek: number;
  recent: { id: string; title: string; village: string; date: string; type: string }[];
  tasks: { id: string; title: string; detail: string; href: string; icon: string }[];
  headline: { label: string; value: number; href: string }[];
};

export function getHomeData(profile: Profile): HomeData {
  const scope = scopeForRole(profile.id, profile.role);
  const villages =
    scope.villageIds === null
      ? db.villages
      : db.villages.filter((v) => scope.villageIds!.includes(v.id));

  const villageIds = new Set(villages.map((v) => v.id));
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const beneficiaries = db.beneficiaries.filter((b) => villageIds.has(b.villageId));
  const addedThisWeek = beneficiaries.filter((b) => isWithin(b.enrolmentDate, weekAgo, new Date())).length;

  const activities = db.activities
    .filter((a) => villageIds.has(a.villageId))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const activitiesThisWeek = activities.filter((a) => isWithin(a.startDate, weekAgo, new Date())).length;

  const recent = activities.slice(0, 4).map((a) => ({
    id: a.id,
    title: a.title,
    village: villages.find((v) => v.id === a.villageId)?.name ?? "—",
    date: a.startDate,
    type: a.activityType,
  }));

  /* Data-entry task list (PRD §8.5: /home shows a task list only). */
  const tasks = [
    {
      id: "task-register",
      title: "Register a new beneficiary",
      detail: "Section 7.3 registration form — arriving in Step 3",
      href: "/beneficiaries/new",
      icon: "people",
    },
    {
      id: "task-activity",
      title: "Log an activity",
      detail: "Add participants and attendance — Step 5",
      href: "/activities/new",
      icon: "activity",
    },
    {
      id: "task-indicator",
      title: "Enter indicator values",
      detail: "Period values for your projects — Step 6",
      href: "/mel",
      icon: "target",
    },
  ];

  return {
    villages: villages.slice(0, 8).map((v) => ({ id: v.id, name: v.name, block: v.block })),
    addedThisWeek,
    activitiesThisWeek,
    recent,
    tasks,
    headline: [
      { label: "Villages assigned", value: villages.length, href: "/villages" },
      { label: "Beneficiaries", value: beneficiaries.length, href: "/beneficiaries" },
      { label: "Activities", value: activities.length, href: "/activities" },
    ],
  };
}
