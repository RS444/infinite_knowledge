import type { KnowledgeTreeResponse, Concept, Topic } from '../types/api';
import type {
  AssessmentQuestion,
  ConceptFlashcard,
  QuestionDifficulty,
} from '../types/assessment';

interface FlattenedConceptItem {
  concept: Concept;
  topic: Topic;
}

/**
 * Deterministic or randomized shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Clean and truncate summary strings for use as option text
 */
function formatOptionSnippet(text: string, maxLength = 140): string {
  if (!text) return 'Standard conceptual guideline.';
  const cleaned = text.replace(/[\r\n]+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Generate multiple-choice assessment questions dynamically from the knowledge tree
 */
export function generateAssessmentQuestions(
  tree: KnowledgeTreeResponse,
  options: {
    count?: number;
    targetUncompletedOnly?: boolean;
    completedConceptIds?: Set<number>;
  } = {}
): AssessmentQuestion[] {
  const { count = 10, targetUncompletedOnly = false, completedConceptIds = new Set() } = options;

  // Flatten all concepts with their topic context
  const flattened: FlattenedConceptItem[] = [];
  for (const topic of tree.topics) {
    for (const concept of topic.concepts) {
      flattened.push({ concept, topic });
    }
  }

  if (flattened.length === 0) return [];

  // Filter if weak-areas mode is active
  let candidateConcepts = flattened;
  if (targetUncompletedOnly && completedConceptIds.size > 0) {
    const uncompleted = flattened.filter((item) => !completedConceptIds.has(item.concept.id));
    if (uncompleted.length >= 3) {
      candidateConcepts = uncompleted;
    }
  }

  // Shuffle candidate concepts
  const shuffledCandidates = shuffleArray(candidateConcepts);
  const selectedItems = shuffledCandidates.slice(0, Math.min(count, shuffledCandidates.length));

  const questions: AssessmentQuestion[] = [];

  selectedItems.forEach((item, index) => {
    const { concept, topic } = item;
    const questionArchetype = index % 4;

    // Pick 3 distractors from other concepts in the subject
    const otherConcepts = flattened
      .filter((other) => other.concept.id !== concept.id)
      .map((other) => other.concept);

    const shuffledOthers = shuffleArray(otherConcepts);
    const distractors = shuffledOthers.slice(0, 3);

    let questionText = '';
    let correctOption = '';
    const wrongOptions: string[] = [];
    let difficulty: QuestionDifficulty = 'core';

    switch (questionArchetype) {
      case 0: {
        // Archetype 1: Concept Definition & Purpose
        difficulty = 'foundational';
        questionText = `What is the primary definition and role of "${concept.name}" in ${topic.name}?`;
        correctOption = formatOptionSnippet(concept.summary);

        for (const distractor of distractors) {
          wrongOptions.push(formatOptionSnippet(distractor.summary));
        }
        break;
      }

      case 1: {
        // Archetype 2: Learning Objective Mapping
        difficulty = 'core';
        const objective = concept.learning_objective || `Understand ${concept.name}`;
        questionText = `Which concept in ${topic.name} specifically addresses the objective: "${objective}"?`;
        correctOption = concept.name;

        for (const distractor of distractors) {
          wrongOptions.push(distractor.name);
        }
        break;
      }

      case 2: {
        // Archetype 3: Keyword Identification
        difficulty = 'applied';
        const keyTerms = (concept.keywords && concept.keywords.length > 0)
          ? concept.keywords.slice(0, 3).join(', ')
          : concept.name;

        questionText = `In the study of ${tree.subject.name}, which concept is centrally characterized by key terms like [${keyTerms}]?`;
        correctOption = concept.name;

        for (const distractor of distractors) {
          wrongOptions.push(distractor.name);
        }
        break;
      }

      default: {
        // Archetype 4: Reverse Objective/Summary Evaluation
        difficulty = 'core';
        questionText = `According to the ${tree.subject.name} curriculum, which statement accurately describes "${concept.name}"?`;
        correctOption = formatOptionSnippet(concept.summary);

        for (const distractor of distractors) {
          wrongOptions.push(formatOptionSnippet(distractor.summary));
        }
        break;
      }
    }

    // Ensure we have 3 distractors even if subject is small
    while (wrongOptions.length < 3) {
      wrongOptions.push(
        `Alternative theoretical construct related to ${topic.name} fundamentals (Option ${wrongOptions.length + 1})`
      );
    }

    // Combine correct answer and distractors, then shuffle
    const rawOptions = [correctOption, ...wrongOptions.slice(0, 3)];
    // Deduplicate in case summaries coincided
    const uniqueOptions = Array.from(new Set(rawOptions));
    while (uniqueOptions.length < 4) {
      uniqueOptions.push(`None of the provided descriptions accurately model ${concept.name}`);
    }

    const shuffledOptions = shuffleArray(uniqueOptions.slice(0, 4));
    const correctIndex = shuffledOptions.indexOf(correctOption);

    const explanation = `"${concept.name}" is defined as: ${concept.summary}. ` +
      (concept.learning_objective ? `Key Objective: ${concept.learning_objective}.` : '');

    questions.push({
      id: `q-${concept.id}-${index}-${Date.now().toString(36)}`,
      conceptId: concept.id,
      conceptName: concept.name,
      topicId: topic.id,
      topicName: topic.name,
      question: questionText,
      options: shuffledOptions,
      correctIndex: correctIndex !== -1 ? correctIndex : 0,
      explanation,
      learningObjective: concept.learning_objective || '',
      conceptSummary: concept.summary,
      keywords: concept.keywords || [],
      difficulty,
    });
  });

  return questions;
}

/**
 * Extract flashcards from a KnowledgeTreeResponse
 */
export function generateFlashcards(
  tree: KnowledgeTreeResponse,
  completedConceptIds: Set<number> = new Set()
): ConceptFlashcard[] {
  const flashcards: ConceptFlashcard[] = [];

  for (const topic of tree.topics) {
    for (const concept of topic.concepts) {
      flashcards.push({
        id: concept.id,
        name: concept.name,
        topicName: topic.name,
        subjectName: tree.subject.name,
        summary: concept.summary,
        learningObjective: concept.learning_objective || `Master the principles of ${concept.name}`,
        keywords: concept.keywords || [],
        isCompleted: completedConceptIds.has(concept.id),
      });
    }
  }

  return flashcards;
}
