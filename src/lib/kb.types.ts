/* Generated from kb/schema/experiment.schema.json by: npm run kb:types. Do not edit by hand; edit the schema. */

/**
 * Where the selector lives. 'host' = the experiment page itself; 'sim' = the same-origin simulator iframe (#fraDisabled); 'sim:<name>' = a nested simulator frame.
 */
export type Frame = string;

/**
 * Ground truth for one Virtual Labs experiment. Everything VLAILA knows about an experiment lives here: the correct procedure, what counts as an error, the theory corpus used for grounded Q&A, and the quiz bank. Authored by a domain expert; never inferred by a model.
 */
export interface VLAILAExperimentKnowledgeBaseEntry {
  /**
   * Schema version this entry targets.
   */
  kb_version: string;
  /**
   * Matches <meta name="experiment-short-name"> on the live experiment page.
   */
  experiment_id: string;
  /**
   * Stable slug for the parent lab.
   */
  lab_id: string;
  title: string;
  /**
   * Live lab origin, e.g. https://pp-iiith.vlabs.ac.in. Used with experiment_id as the auto-lookup key so the embedded widget needs no configuration.
   */
  origin: string;
  discipline:
    | "Electronics and Communication Engineering"
    | "Computer Science and Engineering"
    | "Electrical Engineering"
    | "Mechanical Engineering"
    | "Chemical Engineering"
    | "Biotechnology and Biomedical Engineering"
    | "Civil Engineering"
    | "Physical Sciences"
    | "Chemical Sciences"
    | "Design Engineering";
  /**
   * Developing institute code, e.g. IIITH, IITR.
   */
  institute: string;
  /**
   * Domain reviewer sign-off.
   */
  reviewed_by?: string;
  reviewed_on?: string;
  estimated_minutes?: number;
  aim: string;
  learning_objectives?: string[];
  /**
   * Ordered task pages, matching <meta name="task-name"> on each page. Most labs use the classic eight (Aim, Theory, Pretest, Procedure, Simulation, Posttest, References, Feedback), but learning-unit labs such as ds1-iiith define their own (Demo, Practice, Exercise, Quiz, ...), so any string is accepted.
   */
  tasks?: string[];
  /**
   * Experiments or concepts a student should have met first. Surfaced as a soft pre-flight check, never a hard block.
   */
  prerequisites?: {
    id: string;
    title: string;
    /**
     * One line: what breaks without it.
     */
    why: string;
    /**
     * Optional experiment_id of the prerequisite lab exercise.
     */
    experiment_ref?: string;
  }[];
  /**
   * The correct procedure, in order. Step order defines what 'out of sequence' means.
   *
   * @minItems 1
   */
  steps: [
    {
      id: string;
      order: number;
      /**
       * Must appear in tasks[]. Matched against <meta name="task-name"> to know which page the step lives on.
       */
      task: string;
      title: string;
      description?: string;
      /**
       * Step ids that must be completed first.
       */
      requires?: string[];
      optional?: boolean;
      /**
       * Completing this is a good moment for a CONCEPT reinforcement prompt.
       */
      milestone?: boolean;
      detect?: Detector;
      /**
       * Below this, the student likely skimmed rather than read. Used for gentle HINTs, never WARNs.
       */
      expected_dwell_seconds?: number;
      /**
       * No qualifying interaction for this long on the active step => student may be stuck.
       */
      stuck_after_seconds?: number;
      /**
       * Three escalation levels. Level 1 asks, level 2 tells, level 3 shows.
       */
      hints: {
        nudge: string;
        specific: string;
        interactive?: {
          /**
           * CSS selector to ring in the live UI.
           */
          highlight: string;
          frame?: Frame;
          text: string;
        };
      };
      /**
       * 2-3 sentence 'why did this happen' micro-lesson offered at milestones.
       */
      concept?: string;
      /**
       * id from concepts[]
       */
      concept_ref?: string;
    },
    ...{
      id: string;
      order: number;
      /**
       * Must appear in tasks[]. Matched against <meta name="task-name"> to know which page the step lives on.
       */
      task: string;
      title: string;
      description?: string;
      /**
       * Step ids that must be completed first.
       */
      requires?: string[];
      optional?: boolean;
      /**
       * Completing this is a good moment for a CONCEPT reinforcement prompt.
       */
      milestone?: boolean;
      detect?: Detector;
      /**
       * Below this, the student likely skimmed rather than read. Used for gentle HINTs, never WARNs.
       */
      expected_dwell_seconds?: number;
      /**
       * No qualifying interaction for this long on the active step => student may be stuck.
       */
      stuck_after_seconds?: number;
      /**
       * Three escalation levels. Level 1 asks, level 2 tells, level 3 shows.
       */
      hints: {
        nudge: string;
        specific: string;
        interactive?: {
          /**
           * CSS selector to ring in the live UI.
           */
          highlight: string;
          frame?: Frame;
          text: string;
        };
      };
      /**
       * 2-3 sentence 'why did this happen' micro-lesson offered at milestones.
       */
      concept?: string;
      /**
       * id from concepts[]
       */
      concept_ref?: string;
    }[],
  ];
  /**
   * Authored error patterns. Matched deterministically by the rules engine - no model involved, so these never fire spuriously.
   */
  errors: {
    id: string;
    /**
     * fatal = cannot obtain valid results without correcting; recoverable = can proceed but results may vary. A pedagogical judgement, so it is authored, not inferred.
     */
    severity: "fatal" | "recoverable";
    when: Condition;
    message: string;
    /**
     * Step id the student should go to.
     */
    correction_step?: string;
    /**
     * Optional deeper explanation behind 'Why?'.
     */
    concept?: string;
    confidence?: number;
  }[];
  concepts?: {
    id: string;
    name: string;
    summary: string;
  }[];
  common_misconceptions?: {
    belief: string;
    correction: string;
  }[];
  /**
   * Retrieval corpus for experiment-scoped Q&A. Grounded in the live lab's own Theory/Procedure pages. The retriever never sees chunks from another experiment.
   *
   * @minItems 1
   */
  theory_chunks: [
    {
      id: string;
      heading: string;
      text: string;
      tags?: string[];
      /**
       * URL of the live page this was drawn from.
       */
      source?: string;
    },
    ...{
      id: string;
      heading: string;
      text: string;
      tags?: string[];
      /**
       * URL of the live page this was drawn from.
       */
      source?: string;
    }[],
  ];
  /**
   * Source for the post-experiment 3-question reflection quiz. Answers are authored and verified, never model-generated, so feedback is always correct.
   *
   * @minItems 3
   */
  quiz_bank: [
    {
      id: string;
      question: string;
      /**
       * @minItems 2
       * @maxItems 6
       */
      options:
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string];
      answer_index: number;
      explanation: string;
      concept_ref?: string;
      difficulty?: "beginner" | "intermediate" | "advanced";
    },
    {
      id: string;
      question: string;
      /**
       * @minItems 2
       * @maxItems 6
       */
      options:
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string];
      answer_index: number;
      explanation: string;
      concept_ref?: string;
      difficulty?: "beginner" | "intermediate" | "advanced";
    },
    {
      id: string;
      question: string;
      /**
       * @minItems 2
       * @maxItems 6
       */
      options:
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string];
      answer_index: number;
      explanation: string;
      concept_ref?: string;
      difficulty?: "beginner" | "intermediate" | "advanced";
    },
    ...{
      id: string;
      question: string;
      /**
       * @minItems 2
       * @maxItems 6
       */
      options:
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string];
      answer_index: number;
      explanation: string;
      concept_ref?: string;
      difficulty?: "beginner" | "intermediate" | "advanced";
    }[],
  ];
  references?: string[];
}
/**
 * How the Screen Observer recognises this step being performed.
 */
export interface Detector {
  action:
    "click" | "input" | "change" | "select" | "upload" | "navigate" | "dwell" | "submit" | "canvas";
  selector?: string;
  frame?: Frame;
  /**
   * For action=navigate: the task page whose arrival satisfies this step.
   */
  task?: string;
  value_min?: number;
  value_max?: number;
  /**
   * Regex the value must match.
   */
  value_pattern?: string;
  value_in?: string[];
  /**
   * Occurrences needed to complete.
   */
  count?: number;
}
/**
 * All present keys must hold (logical AND). Absent keys are ignored.
 */
export interface Condition {
  action?:
    "click" | "input" | "change" | "select" | "upload" | "navigate" | "dwell" | "submit" | "canvas";
  selector?: string;
  frame?: Frame;
  /**
   * Only fires while this task page is open.
   */
  on_task?: string;
  /**
   * Fires only if NONE of these step ids are complete - the out-of-order detector.
   */
  unless_completed?: string[];
  /**
   * Fires only if ALL of these step ids are complete.
   */
  after_completed?: string[];
  value_out_of_range?: {
    min?: number;
    max?: number;
  };
  value_equals?: string;
  /**
   * Fires only after the same action repeats this many times - the thrashing detector.
   */
  repeat_count?: number;
  /**
   * Fires after this long with no qualifying interaction.
   */
  idle_seconds?: number;
}
