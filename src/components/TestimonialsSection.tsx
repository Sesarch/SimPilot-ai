import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Marcus T.",
    role: "Private Pilot Student",
    content:
      "SimPilot.AI completely changed how I prepare for my oral exam. The AI tutor explains complex aerodynamics concepts in a way that finally clicks. I passed my checkride on the first attempt!",
    rating: 5,
    initials: "MT",
  },
  {
    name: "Sarah K.",
    role: "Instrument Rating Candidate",
    content:
      "The oral exam simulator is incredibly realistic. It threw curveballs at me just like my actual DPE did. I felt so much more confident walking into my checkride thanks to the practice sessions.",
    rating: 5,
    initials: "SK",
  },
  {
    name: "James R.",
    role: "Commercial Pilot Student",
    content:
      "As someone studying for my commercial certificate, the ground school module is a lifesaver. Being able to drill into weather theory and regulations at 2 AM when I can't sleep is priceless.",
    rating: 5,
    initials: "JR",
  },
  {
    name: "Emily W.",
    role: "CFI Candidate",
    content:
      "I use SimPilot.AI to practice explaining concepts to students. The AI challenges my understanding and helps me find gaps in my knowledge before my students do. Highly recommend for CFI prep!",
    rating: 4,
    initials: "EW",
  },
  {
    name: "David L.",
    role: "Sport Pilot",
    content:
      "Even as a sport pilot, the fundamentals training here is top-notch. The bite-sized lessons fit perfectly into my busy schedule, and the progress tracking keeps me motivated.",
    rating: 5,
    initials: "DL",
  },
  {
    name: "Patricia N.",
    role: "Flight School Owner",
    content:
      "I recommend SimPilot.AI to all my students as a supplemental study tool. It reinforces what we cover in ground school and helps them come to lessons better prepared.",
    rating: 5,
    initials: "PN",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-orbitron text-foreground mb-4">
            What Pilots Are Saying
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of student pilots who are using SimPilot.AI to
            accelerate their training journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card
              key={i}
              className="bg-card border-border hover:border-primary/40 transition-colors duration-300"
            >
              <CardContent className="p-6 flex flex-col gap-4">
                <Quote className="h-6 w-6 text-primary/40" />
                <p className="text-secondary-foreground text-sm leading-relaxed flex-1">
                  "{t.content}"
                </p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s < t.rating
                          ? "text-accent fill-accent"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
