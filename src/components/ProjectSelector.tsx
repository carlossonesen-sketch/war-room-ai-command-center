import { ProjectActions } from "./ProjectActions";
import type { ProjectAliasMap, ProjectContext, ProjectStatus } from "../types";

const projectStatuses: ProjectStatus[] = ["Idea", "Building", "Testing", "Launched"];

interface ProjectSelectorProps {
  project: ProjectContext;
  localWorkspaceRoot: string;
  projectAliases: ProjectAliasMap;
  onUpdateProject: (updates: Partial<ProjectContext>) => void;
  onUpdateLocalWorkspaceRoot: (rootPath: string) => void;
  onUpdateProjectAliases: (aliases: ProjectAliasMap) => void;
}

export function ProjectSelector({
  project,
  localWorkspaceRoot,
  projectAliases,
  onUpdateProject,
  onUpdateLocalWorkspaceRoot,
  onUpdateProjectAliases
}: ProjectSelectorProps) {
  const aliasText = Object.entries(projectAliases)
    .map(([projectName, aliases]) => `${projectName}: ${aliases.join(", ")}`)
    .join("\n");

  function updateAliases(value: string) {
    const aliases = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reduce<ProjectAliasMap>((nextAliases, line) => {
        const [projectName, aliasList = ""] = line.split(":");
        const trimmedProject = projectName?.trim();

        if (trimmedProject) {
          nextAliases[trimmedProject] = aliasList
            .split(",")
            .map((alias) => alias.trim())
            .filter(Boolean);
        }

        return nextAliases;
      }, {});

    onUpdateProjectAliases(aliases);
  }

  return (
    <section className="project-selector" aria-label="Project selector">
      <label>
        <span>Project name</span>
        <input
          type="text"
          value={project.name}
          onChange={(event) => onUpdateProject({ name: event.target.value })}
        />
      </label>

      <label className="project-selector__path">
        <span>Selected live project path</span>
        <input
          type="text"
          value={project.path}
          onChange={(event) => onUpdateProject({ path: event.target.value })}
        />
      </label>

      <label>
        <span>Status</span>
        <select
          value={project.status}
          onChange={(event) => onUpdateProject({ status: event.target.value as ProjectStatus })}
        >
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="project-selector__path">
        <span>War Room workspace root</span>
        <input
          type="text"
          value={localWorkspaceRoot}
          onChange={(event) => onUpdateLocalWorkspaceRoot(event.target.value)}
          placeholder="D:\\dev\\war-room"
        />
      </label>

      <div className="project-selector__storage-note">
        <strong>Local workspace layout</strong>
        <span>D:\dev\war-room\projects = full read-only project code copies.</span>
        <span>D:\dev\war-room\memory = markdown memory and status summaries only.</span>
        <span>War Room never writes to project copies unless a future write mode is explicitly enabled.</span>
      </div>

      <ProjectActions projectPath={project.path} />

      <label className="project-selector__aliases">
        <span>Project aliases</span>
        <textarea
          value={aliasText}
          onChange={(event) => updateAliases(event.target.value)}
          rows={5}
        />
      </label>
    </section>
  );
}
