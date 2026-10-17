import { Separator } from "@/components/ui/separator";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Section } from "@/features/app-shell/components/Section";
import { LandingFooter } from "@/features/home/components/LandingFooter";
import { LandingHeader } from "@/features/home/components/LandingHeader";
import {
  PRIVACY_CONTACT_BODY,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_CONTACT_LABEL,
  PRIVACY_DESCRIPTION,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
} from "@/features/privacy/containers/PrivacyContainer/PrivacyContainer.constants";

export function PrivacyContainer() {
  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader />
      <main className="flex flex-1 flex-col">
        <Section innerClassName="flex flex-col gap-12">
          <div className="flex max-w-xl flex-col gap-3">
            <Heading as={EHeadingTag.H1} variant={EHeadingVariant.SECTION}>
              {PRIVACY_TITLE}
            </Heading>
            <p className="text-base leading-relaxed text-pretty text-muted-foreground">
              {PRIVACY_DESCRIPTION}
            </p>
            <p className="text-sm text-muted-foreground">{PRIVACY_EFFECTIVE_DATE}</p>
          </div>
          <dl className="flex min-w-0 max-w-3xl flex-col">
            {PRIVACY_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-6">
                <Separator />
                <div className="grid grid-cols-1 gap-2 pb-6 sm:grid-cols-5 sm:gap-6">
                  <dt className="sm:col-span-2">
                    <Heading as={EHeadingTag.H2} variant={EHeadingVariant.ITEM}>
                      {section.title}
                    </Heading>
                  </dt>
                  <dd className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground sm:col-span-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </dd>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-6">
              <Separator />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-6">
                <dt className="sm:col-span-2">
                  <Heading as={EHeadingTag.H2} variant={EHeadingVariant.ITEM}>
                    {PRIVACY_CONTACT_LABEL}
                  </Heading>
                </dt>
                <dd className="min-w-0 text-sm leading-relaxed text-muted-foreground sm:col-span-3">
                  {PRIVACY_CONTACT_BODY}{" "}
                  <a
                    href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                    className="break-all text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    {PRIVACY_CONTACT_EMAIL}
                  </a>
                  .
                </dd>
              </div>
            </div>
          </dl>
        </Section>
      </main>
      <LandingFooter />
    </div>
  );
}
