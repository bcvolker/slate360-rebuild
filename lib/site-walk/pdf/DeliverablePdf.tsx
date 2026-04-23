import React from "react";
import { EMAIL_COLORS } from "@/lib/email-theme";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";

export interface DeliverablePdfBranding {
  logoUrl: string | null;
  signatureUrl: string | null;
  primaryColor: string | null;
  companyName: string | null;
}

export interface DeliverablePdfProps {
  data: ViewerDeliverable;
  branding: DeliverablePdfBranding;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: EMAIL_COLORS.pdfBody,
    backgroundColor: EMAIL_COLORS.cardBg,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: EMAIL_COLORS.cardBorder,
    paddingBottom: 16,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    maxHeight: 40,
    maxWidth: 140,
    objectFit: "contain",
    marginRight: 12,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: EMAIL_COLORS.textInverseDark,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    maxWidth: "50%",
    textAlign: "right",
  },
  metadataBlock: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: EMAIL_COLORS.pdfSubtleBg,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCol: {
    flexDirection: "column",
  },
  metaLabel: {
    color: EMAIL_COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  metaValue: {
    color: EMAIL_COLORS.textPrimary,
    fontWeight: "bold",
    fontSize: 12,
  },
  itemContainer: {
    marginBottom: 32,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: EMAIL_COLORS.textPrimary,
    marginBottom: 8,
  },
  itemImage: {
    width: "100%",
    maxHeight: 350,
    objectFit: "contain",
    borderRadius: 6,
    marginBottom: 12,
  },
  itemNotes: {
    fontSize: 11,
    color: EMAIL_COLORS.textBody,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  itemTranscript: {
    fontSize: 11,
    color: EMAIL_COLORS.textBody,
    lineHeight: 1.5,
    fontStyle: "italic",
    padding: 8,
    backgroundColor: EMAIL_COLORS.quoteBg,
    borderRadius: 4,
    marginBottom: 8,
  },
  itemMetadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: EMAIL_COLORS.quoteBg,
  },
  itemMetaBadge: {
    fontSize: 9,
    color: EMAIL_COLORS.textMuted,
    marginRight: 12,
  },
  linkText: {
    fontSize: 10,
    color: EMAIL_COLORS.primary,
    textDecoration: "underline",
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: EMAIL_COLORS.cardBorder,
    paddingTop: 16,
  },
  footerSignature: {
    maxHeight: 40,
    maxWidth: 120,
    objectFit: "contain",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 9,
    color: EMAIL_COLORS.textFaint,
  },
  footerRight: {
    alignItems: "flex-end",
  },
});

export function DeliverablePdf({ data, branding }: DeliverablePdfProps) {
  const generatedDate = new Date().toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {branding.logoUrl && <Image src={branding.logoUrl} style={styles.logo} />}
            {branding.companyName && <Text style={styles.companyName}>{branding.companyName}</Text>}
          </View>
          <Text
            style={
              branding.primaryColor
                ? [styles.reportTitle, { color: branding.primaryColor }]
                : styles.reportTitle
            }
          >
            {data.title}
          </Text>
        </View>

        <View style={styles.metadataBlock}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Prepared By</Text>
            <Text style={styles.metaValue}>{data.senderName}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Generated On</Text>
            <Text style={styles.metaValue}>{generatedDate}</Text>
          </View>
        </View>

        <View>
          {data.items.map((item, index) => {
            const showImage =
              ["photo", "photo_360", "thermal", "time_lapse"].includes(item.type) && item.url;
            const isInteractive = ["tour_360", "model_3d"].includes(item.type);
            const showTranscript = ["video", "voice"].includes(item.type) && item.transcript;

            return (
              <View key={item.id || index} style={styles.itemContainer} wrap={false}>
                <Text style={styles.itemTitle}>{item.title}</Text>

                {showImage && item.url && <Image src={item.url} style={styles.itemImage} />}

                {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}

                {showTranscript && (
                  <Text style={styles.itemTranscript}>
                    Transcript: &quot;{item.transcript}&quot;
                  </Text>
                )}

                {isInteractive && (
                  <Text style={styles.linkText}>
                    View interactive {item.type.replace("_", " ")} at: {APP_URL}/view/
                    {data.shareToken}
                  </Text>
                )}

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <View style={styles.itemMetadataRow}>
                    {data.metadataVisibility.timestamp && item.metadata.timestamp && (
                      <Text style={styles.itemMetaBadge}>
                        Time: {new Date(item.metadata.timestamp).toLocaleString()}
                      </Text>
                    )}
                    {data.metadataVisibility.author && item.metadata.author && (
                      <Text style={styles.itemMetaBadge}>Author: {item.metadata.author}</Text>
                    )}
                    {data.metadataVisibility.gps && item.metadata.gps && (
                      <Text style={styles.itemMetaBadge}>
                        GPS: {item.metadata.gps.lat.toFixed(6)},{" "}
                        {item.metadata.gps.lng.toFixed(6)}
                      </Text>
                    )}
                    {data.metadataVisibility.weather && item.metadata.weather && (
                      <Text style={styles.itemMetaBadge}>Weather: {item.metadata.weather}</Text>
                    )}
                    {data.metadataVisibility.device && item.metadata.device && (
                      <Text style={styles.itemMetaBadge}>Device: {item.metadata.device}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <View>
            {branding.signatureUrl && (
              <Image src={branding.signatureUrl} style={styles.footerSignature} />
            )}
            <Text style={styles.footerText}>Prepared by {data.senderName}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) =>
                `Page ${pageNumber} of ${totalPages}`
              }
            />
            <Text style={styles.footerText}>Generated by Slate360</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
