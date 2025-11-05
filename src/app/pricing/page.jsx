import Breadcrumb from "@/components/Breadcrumb";
import PricingLayer from "@/components/PricingLayer";
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
        <Breadcrumb title='Pricing' />

        {/* PricingLayer */}
        <PricingLayer />
      </MasterLayout>
    </>
  );
};

export default Page;
