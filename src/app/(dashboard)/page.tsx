import { protectServer } from "@/features/auth/utils";

import { Banner } from "./banner";
import { ProjectsSection } from "./projects-section";
import { TemplatesSection } from "./templates-section";
import StepsDisplay from "./steps-display";

export default async function Home() {
  await protectServer();

  return (
    <div className="flex flex-col space-y-12 max-w-screen-xl mx-auto pb-10">
      <Banner />
      <StepsDisplay />
      <TemplatesSection />
      <ProjectsSection />
    </div>
  );
}
