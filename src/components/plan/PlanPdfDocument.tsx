import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { PlanStep, AIBot } from "@/hooks/usePlanSteps";

// Register a font that supports Cyrillic
Font.register({
  family: "Roboto",
  fonts: [
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 11,
    lineHeight: 1.6,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
    color: "#1a1a1a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  section: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    color: "#333",
  },
  sectionMeta: {
    fontSize: 9,
    color: "#888",
    marginBottom: 10,
  },
  content: {
    fontSize: 11,
    color: "#444",
    lineHeight: 1.7,
  },
  paragraph: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  listItem: {
    marginLeft: 15,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#999",
    textAlign: "center",
  },
  status: {
    fontSize: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  completed: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  pending: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
});

interface PlanPdfDocumentProps {
  steps: PlanStep[];
  bots: AIBot[];
  projectName?: string;
}

// Simple markdown parser for PDF
function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<Text key={key++} style={styles.paragraph}>{' '}</Text>);
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={key++} style={[styles.heading, { fontSize: 12 }]}>
          {trimmed.replace('### ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={key++} style={styles.heading}>
          {trimmed.replace('## ', '')}
        </Text>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={key++} style={[styles.heading, { fontSize: 14 }]}>
          {trimmed.replace('# ', '')}
        </Text>
      );
    }
    // List items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <Text key={key++} style={styles.listItem}>
          • {trimmed.substring(2)}
        </Text>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <Text key={key++} style={styles.listItem}>
          {trimmed}
        </Text>
      );
    }
    // Regular paragraph
    else {
      // Remove markdown formatting
      const cleanText = trimmed
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');
      elements.push(
        <Text key={key++} style={styles.paragraph}>
          {cleanText}
        </Text>
      );
    }
  }

  return elements;
}

export function PlanPdfDocument({ steps, bots, projectName }: PlanPdfDocumentProps) {
  const date = new Date().toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {projectName || 'Бизнес План'}
        </Text>
        <Text style={styles.subtitle}>
          Генериран на {date}
        </Text>

        {steps.map((step, index) => {
          const assignedBot = bots.find(b => b.id === step.assigned_bot_id);
          
          return (
            <View key={step.id} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>
                {index + 1}. {step.title}
              </Text>
              
              <View style={[styles.status, step.completed ? styles.completed : styles.pending]}>
                <Text>{step.completed ? 'Завършено' : 'В процес'}</Text>
              </View>

              {assignedBot && (
                <Text style={styles.sectionMeta}>
                  Генерирано от: {assignedBot.name}
                </Text>
              )}

              {step.description && (
                <Text style={[styles.content, { fontStyle: 'italic', marginBottom: 10 }]}>
                  {step.description}
                </Text>
              )}

              <View style={styles.content}>
                {step.generated_content ? (
                  parseMarkdown(step.generated_content)
                ) : (
                  <Text style={{ color: '#999' }}>
                    Няма генерирано съдържание
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.footer} fixed>
          Създадено с Team Genius Talk
        </Text>
      </Page>
    </Document>
  );
}
