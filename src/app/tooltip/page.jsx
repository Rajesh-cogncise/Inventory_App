import Breadcrumb from "@/components/Breadcrumb";
import ThemeLayer from "@/components/ThemeLayer";
import TooltipLayer from "@/components/TooltipLayer";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Cogncise - Asset Management System",
  description:
    "Wowdash NEXT JS is a developer-friendly, ready-to-use admin template designed for building attractive, scalable, and high-performing web applications.",
};

const Page = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Components / Tooltip' />

        {/* TooltipLayer */}
        <TooltipLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
