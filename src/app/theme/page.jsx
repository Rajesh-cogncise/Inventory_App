import Breadcrumb from "@/components/Breadcrumb";
import ThemeLayer from "@/components/ThemeLayer";
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
        <Breadcrumb title='Settings - Theme' />

        {/* ThemeLayer */}
        <ThemeLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
