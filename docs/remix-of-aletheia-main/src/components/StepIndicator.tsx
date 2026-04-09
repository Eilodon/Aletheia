import { motion } from "framer-motion";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * Subtle dot-based step indicator for the reading flow.
 * Steps: 1=Situation, 2=Wildcard, 3=Ritual, 4=Passage
 */
export default function StepIndicator({ currentStep, totalSteps = 4, className = "" }: StepIndicatorProps) {
  return (
    <motion.div
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isPast = step < currentStep;
        return (
          <motion.div
            key={i}
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className={`rounded-full transition-all duration-500 ${
                isActive
                  ? "w-6 h-1.5 bg-gold/60"
                  : isPast
                    ? "w-1.5 h-1.5 bg-gold/30"
                    : "w-1.5 h-1.5 bg-muted-foreground/15"
              }`}
            />
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gold/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
