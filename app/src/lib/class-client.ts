// Browser-side class state. Only a class code, its name, a random learner id and a nickname: no personal data.
export type JoinedClass = { code: string; name: string; joined?: boolean };
export type TeacherClass = { code: string; name: string; token: string };
export type Missions = Partial<Record<"claim" | "backup" | "send" | "lightning", number>>;

const CLASS_KEY = "satsclass.class";
const LEARNER_KEY = "satsclass.learner";
const TEACH_KEY = "satsclass.teach";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const getClass = () => read<JoinedClass>(CLASS_KEY);
export const setClass = (c: JoinedClass | null) => write(CLASS_KEY, c);

/** Stable random id for this device, used to keep a learner's progress across visits. */
export function learnerId(): string {
  let id = read<string>(LEARNER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(LEARNER_KEY, id);
  }
  return id;
}

export const getTeacherClass = () => read<TeacherClass>(TEACH_KEY);
export const setTeacherClass = (c: TeacherClass | null) => write(TEACH_KEY, c);
