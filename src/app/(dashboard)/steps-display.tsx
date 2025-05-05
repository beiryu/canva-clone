import Image from "next/image";

export default function StepsDisplay() {
  const steps = [
    {
      number: "01",
      image: "https://placehold.co/400x300",
      description:
        "A high-fashion 1980s-inspired portrait of a model against a clear blue sky, with a soft vintage film effect. The model has glowing skin with a matte finish, nude lips, and natural, sleek blond hair in a cropped pixie cut...",
    },
    {
      number: "02",
      image: "https://placehold.co/400x300",
      description:
        "A high-fashion 1980s-inspired portrait of a model against a clear blue sky, with a soft vintage film effect. The model has glowing skin with a matte finish, nude lips, and natural, sleek blond hair in a cropped pixie cut...",
    },
    {
      number: "03",
      image: "https://placehold.co/400x300",
      description:
        "A high-fashion 1980s-inspired portrait of a model against a clear blue sky, with a soft vintage film effect. The model has glowing skin with a matte finish, nude lips, and natural, sleek blond hair in a cropped pixie cut...",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {steps.map((step) => (
        <div key={step.number} className="relative">
          <div className="absolute -left-3 -top-3 z-10 flex items-center justify-center w-12 h-12 rounded-full bg-[#c4ff33] text-black font-bold">
            {step.number}
          </div>
          <div className="rounded-lg overflow-hidden">
            <Image
              src={step.image || "/placeholder.svg"}
              alt={`Step ${step.number}`}
              width={400}
              height={300}
              className="w-full h-48 object-cover"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 line-clamp-3">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}
