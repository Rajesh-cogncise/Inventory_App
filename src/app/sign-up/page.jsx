import SignUpLayer from "@/components/SignUpLayer";
import MasterLayout from "@/masterLayout/MasterLayout";
import Breadcrumb from "@/components/Breadcrumb";

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
        <Breadcrumb title='Role Access' />
        {/* SignUpLayer */}
        <SignUpLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
