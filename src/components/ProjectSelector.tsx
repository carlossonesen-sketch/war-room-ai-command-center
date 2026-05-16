import { ProjectActions } from "./ProjectActions";
import type { ProjectContext, ProjectStatus } from "../types";

const projectStatuses: ProjectStatus[] = ["Idea", "Building", "Testing", "Launched"];

interface ProjectSelectorProps {
  project: ProjectContext;
  onUpdateProject: (updates: Partial<ProjectContext>) => void;
}

export function ProjectSelector({ project, onUpdateProject }: ProjectSelectorProps) {
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
        <span>Local path</span>
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

      <ProjectActions projectPath={project.path} />
    </section>
  );
}
