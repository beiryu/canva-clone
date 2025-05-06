import Image from "next/image";

export default function StepsDisplay() {
  const steps = [
    {
      number: "01",
      image: "/step-1.png",
      title: "Sketch",
      description:
        "Draw your ideas with our simple sketch tools. Express your creativity through basic shapes and lines.",
    },
    {
      number: "02",
      image: "/step-2.png",
      title: "Generate",
      description:
        "Let AI transform your sketch into a professional thumbnail. Our AI understands your vision and adds professional polish.",
    },
    {
      number: "03",
      image: "/step-3.png",
      title: "Edit",
      description:
        "Fine-tune your thumbnail with our editor. Adjust colors, add text, and apply effects to perfect your design.",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {steps.map((step) => (
        <div key={step.number} className="relative">
          <div className="absolute left-3 top-3 z-10 flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-black text-2xl font-bold">
            {step.number}
          </div>
          <div className="rounded-lg overflow-hidden">
            <Image
              src={step.image || "/placeholder.svg"}
              alt={`Step ${step.number}`}
              width={400}
              height={300}
              className="w-full h-56 object-cover"
            />
          </div>
          <h3 className="text-xl text-white mt-2 line-clamp-3">{step.title}</h3>
          <p className="text-xs text-gray-400 mt-2 line-clamp-3">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}
