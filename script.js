/* CarePath Houston
   Runs entirely in the browser. Answers are kept in memory only.
   Hospital rules below are limited to documents checked on October 14, 2026.
   Income math uses the 2026 HHS poverty guidelines. It never decides eligibility
   and never estimates a dollar savings amount. */

(function () {
  "use strict";

  /* 2026 poverty guidelines, 48 contiguous states and D.C.
     Federal Register, January 15, 2026. */
  var FPL_2026 = {
    1: 15960,
    2: 21640,
    3: 27320,
    4: 33000,
    5: 38680,
    6: 44360,
    7: 50040,
    8: 55720
  };

  var FPL_URL = "https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines";

  /* Configurable policy record. Screening reads these fields and only
     compares income when verificationStatus is "verified". */
  var hospitalPolicies = {
    houstonMethodist: {
      verificationStatus: "verified",
      lastChecked: "2026-10-14",
      policyUrl: "https://www.houstonmethodist.org/pay-your-bill/new-policies/",
      sources: [
        {
          url: "https://www.houstonmethodist.org/pay-your-bill/new-policies/",
          labelKey: "sources.methodistPage"
        }
      ],
      contact: { phone: "877-493-3228", phoneLocal: "832-667-5900" },
      /* Published ranges are percents of FPL, not invented dollar cutoffs. */
      bands: { lowMax: 200, midMax: 500 },
      above500BalanceShare: 0.1,
      paymentPlan: { interestFree: true, maxMonths: 18 },
      insuranceRule: "uninsured, underinsured, ineligible for a government program, or otherwise unable to pay"
    },
    memorialHermann: {
      verificationStatus: "verified",
      lastChecked: "2026-10-14",
      policyReviewDate: "2022-10-04",
      incomeTableYear: "2026",
      policyUrl: "https://memorialhermann.org/-/media/memorial-hermann/org/files/patients-and-visitors/financial-assistance-program/english_financial-assistance-policy.ashx",
      sources: [
        {
          url: "https://memorialhermann.org/-/media/memorial-hermann/org/files/patients-and-visitors/financial-assistance-program/english_financial-assistance-policy.ashx",
          labelKey: "sources.memorialPolicy"
        },
        {
          url: "https://memorialhermann.org/-/media/memorial-hermann/org/files/patients-and-visitors/financial-assistance-program/english_federal-poverty-guidelines.pdf",
          labelKey: "sources.memorialTable"
        }
      ],
      contact: { phone: "713-338-5502" },
      bands: { lowMax: 200, midMax: 400 },
      /* Their posted size-7 row ($50,404) does not match HHS ($50,040). */
      size7Conflict: { hospitalAnnual: 50404, hhsAnnual: 50040 },
      uninsuredFreeCare: true,
      paymentPlan: { extended: true, maxMonths: null }
    },
    harrisHealth: {
      verificationStatus: "verified",
      lastChecked: "2026-10-14",
      policyUrl: "https://www.harrishealth.org/access-care-hh/eligibility",
      sources: [
        {
          url: "https://www.harrishealth.org/access-care-hh/eligibility",
          labelKey: "sources.harrisPage"
        },
        {
          url: "https://www.harrishealth.org/access-care-hh/Pages/financial-assistance-program.aspx",
          labelKey: "sources.harrisCopay"
        }
      ],
      contact: { phone: "713-566-6509" },
      bands: { lowMax: 150 },
      residencyRequired: "Harris County",
      residencyCollected: false,
      copays: { clinic: 3, emergency: 25, inpatient: 50 }
    },
    texasChildrens: {
      verificationStatus: "verified",
      lastChecked: "2026-10-14",
      summaryDate: "2025-10-02",
      policyUrl: "https://www.texaschildrens.org/sites/tc/files/uploads/documents/Plain%20Language%20Summary%20-%20English%20and%20Spanish%2010-2-25_0001.pdf",
      sources: [
        {
          url: "https://www.texaschildrens.org/sites/tc/files/uploads/documents/Plain%20Language%20Summary%20-%20English%20and%20Spanish%2010-2-25_0001.pdf",
          labelKey: "sources.tchSummary"
        },
        {
          url: "https://www.texaschildrens.org/patients-families/insurance-and-billing/financial-assistance",
          labelKey: "sources.tchPage"
        }
      ],
      contact: null,
      /* Strict bands from the plain-language summary. Gaps are left unknown. */
      bands: { under: 250, midMin: 251, midMax: 325, highMin: 326, highMax: 400 },
      deductibleMayApply: true
    },
    hcaHouston: {
      verificationStatus: "verified",
      lastChecked: "2026-10-14",
      policyUrl: "https://www.hcahoustonhealthcare.com/patient-resources/patient-financial-resources/financial-assistance",
      sources: [
        {
          url: "https://www.hcahoustonhealthcare.com/patient-resources/patient-financial-resources/financial-assistance",
          labelKey: "sources.hcaPage"
        },
        {
          url: "https://www.hcahoustonhealthcare.com/patient-resources/patient-financial-resources/pricing-faqs",
          labelKey: "sources.hcaFaq"
        }
      ],
      contact: null,
      bands: { lowMax: 200, midMax: 400 },
      expandedBalanceMinimum: 1500,
      locationRulesVary: true
    },
    other: {
      verificationStatus: "unverified",
      lastChecked: "2026-10-14",
      policyUrl: null,
      sources: [],
      contact: null,
      bands: null
    }
  };

  var translations = {
    en: {
      meta: {
        title: "CarePath Houston",
        description: "CarePath Houston helps families review hospital bill options and write a financial assistance request. It does not decide eligibility."
      },
      skip: "Skip to content",
      brand: { tag: "Help with hospital bills" },
      lang: { group: "Language" },
      nav: {
        label: "Main",
        home: "Home",
        form: "Your Information",
        results: "Results",
        letter: "Letter",
        resultsLocked: "Results, available after you submit the form",
        letterLocked: "Letter, available after you submit the form"
      },
      home: {
        eyebrow: "For families in Houston",
        headline: "A Clear Path to Affordable Care",
        photoAlt: "Patients smiling together in a bright hospital lounge.",
        support: "Find out whether you may qualify for hospital financial assistance, discounts, or a more affordable payment plan.",
        cta: "Check My Options",
        reassure: "Free to use. No account required. Available in English and Spanish.",
        feature1Title: "Understand Your Options",
        feature1Text: "Explore potential medical bill assistance.",
        feature2Title: "Find Financial Help",
        feature2Text: "Learn what to ask your hospital.",
        feature3Title: "Get a Ready-to-Use Letter",
        feature3Text: "Generate a personalized request for financial assistance.",
        howTitle: "How it works",
        step1: "Tell us about your household.",
        step2: "Review possible assistance options.",
        step3: "Generate a letter to your hospital."
      },
      form: {
        title: "Tell us about your household",
        intro: "Use your best estimates. Hospitals do not share one set of rules, and this page does not decide whether you qualify.",
        privacy: "Do not enter a Social Security number, medical record number, diagnosis, or account number. Your answers stay on this device until you close the page. Nothing is sent to a hospital. This is not legal, financial, or medical advice, and it is not a HIPAA service.",
        requiredNote: "Fields with * are required.",
        hospital: {
          legend: "Hospital information",
          label: "Hospital or health system *",
          help: "Each hospital writes its own financial assistance rules. This list does not mean the rules are the same.",
          placeholder: "Select a hospital",
          houstonMethodist: "Houston Methodist",
          memorialHermann: "Memorial Hermann",
          harrisHealth: "Harris Health System",
          texasChildrens: "Texas Children's Hospital",
          hcaHouston: "HCA Houston Healthcare",
          other: "Other Houston-area hospital"
        },
        other: {
          label: "Hospital name *",
          help: "This name is used in your results and your letter."
        },
        household: {
          legend: "Household information",
          size: "Household size *",
          sizeHelp: "Count the people who live together and share income and expenses. If there are more than 8 people, choose 8+.",
          placeholder: "Select household size",
          eightPlus: "8 or more"
        },
        income: {
          label: "Total annual household income (US dollars) *",
          help: "A yearly estimate before taxes is fine. Include income for the people in the household."
        },
        bill: {
          legend: "Medical bill information",
          amount: "Approximate medical bill (US dollars) *",
          amountHelp: "The amount still owed, or your best estimate if the bill has not arrived."
        },
        insurance: {
          label: "Insurance status *",
          help: "Choose the option that best matches the patient. If you are not sure, choose Unsure.",
          placeholder: "Select insurance status",
          uninsured: "Uninsured",
          insured: "Insured",
          medicaid: "Medicaid/CHIP",
          medicare: "Medicare",
          unsure: "Unsure"
        },
        billStatus: {
          label: "Bill status *",
          help: "This helps word your letter. It does not decide whether the hospital will help.",
          placeholder: "Select bill status",
          justReceived: "Just received the bill",
          paying: "Already making payments",
          collections: "Sent to collections",
          notYetBilled: "Care planned but not yet billed"
        },
        letter: { legend: "Letter information" },
        name: {
          label: "Name for the letter (optional)",
          help: "Used only to sign the letter on this device. Leave it blank if you prefer."
        },
        letterLang: {
          label: "Preferred letter language",
          help: "The letter uses this language even if the rest of the site is in the other language.",
          en: "English",
          es: "Spanish"
        },
        submit: "See my options",
        submitHelp: "You can come back and change these answers. They are not saved after you close the page."
      },
      errors: {
        summary: "Please fix the marked fields.",
        hospital: "Choose a hospital.",
        other: "Enter the hospital name.",
        household: "Choose a household size.",
        incomeRequired: "Enter the annual household income.",
        incomeNumber: "Use numbers only for income.",
        incomeNegative: "Income cannot be negative.",
        incomeCents: "Use dollars and cents, with no more than two decimal places.",
        billRequired: "Enter the approximate bill amount.",
        billNumber: "Use numbers only for the bill.",
        billNegative: "The bill amount cannot be negative.",
        billCents: "Use dollars and cents, with no more than two decimal places.",
        insurance: "Choose an insurance status.",
        billStatus: "Choose a bill status."
      },
      results: {
        title: "Possible assistance options",
        intro: "These notes explain what the hospital has published and what you can ask. They are not a decision about your account.",
        unknownBanner: "Unknown eligibility outcome. This screening does not decide whether assistance will be approved. The hospital makes that decision.",
        unverified: "We could not confirm this hospital's current eligibility requirements. You may still qualify for assistance. Contact the hospital's financial assistance department to request a screening.",
        disclaimer: "This is an informational screening, not a guarantee of eligibility or a final hospital decision. The hospital determines actual eligibility and assistance amounts.",
        summaryTitle: "What you entered",
        hospital: "Hospital",
        household: "Household size",
        income: "Annual income",
        bill: "Medical bill",
        insurance: "Insurance",
        billStatus: "Bill status",
        confirmedHeading: "Confirmed policy information",
        compareHeading: "How your numbers compare",
        notADecision: "This comparison is not a decision. The hospital decides who receives help and how much.",
        checked: "Sources checked October 14, 2026.",
        fplNote: "Income lines use the 2026 federal poverty guidelines for the 48 contiguous states and the District of Columbia.",
        newTab: "opens in a new tab",
        optionsHeading: "Options to ask about",
        stepsHeading: "Recommended next steps",
        what: "What it is",
        why: "Why ask about it",
        next: "What to do next",
        status: {
          confirmed: "Confirmed policy information",
          possible: "Possible option to ask about",
          unknown: "Unknown eligibility outcome"
        },
        generate: "Generate My Hospital Letter",
        edit: "Edit My Answers",
        startOver: "Start Over"
      },
      sources: {
        fpl: "2026 federal poverty guidelines (Federal Register)",
        methodistPage: "Houston Methodist financial assistance policies",
        memorialPolicy: "Memorial Hermann financial assistance policy",
        memorialTable: "Memorial Hermann 2026 income table",
        harrisPage: "Harris Health eligibility page",
        harrisCopay: "Harris Health copay table",
        tchSummary: "Texas Children's plain-language summary (October 2, 2025)",
        tchPage: "Texas Children's financial assistance page",
        hcaPage: "HCA Houston Healthcare financial assistance page",
        hcaFaq: "HCA Houston Healthcare pricing FAQ"
      },
      policy: {
        methodist: {
          rules: "Houston Methodist publishes a financial assistance policy. At or below 200% of the federal poverty guidelines, the policy describes free emergency and medically necessary care. Above 200% and not more than 500%, it describes a discount capped at the average amount paid by private insurance and Medicare. It does not publish one discount percent for that range, so this site does not estimate one. Above 500%, a discount may still be available, including when the bill is more than 10% of family income. The hospital also offers an interest-free payment plan of up to 18 months. The policy is written for people who are uninsured, underinsured, ineligible for a government program, or otherwise unable to pay. You can ask for the policy and application on the hospital website, in admitting and registration, or by calling 877-493-3228 (toll-free) or 832-667-5900 (local).",
          low: "The income entered is at or below 200% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The published policy describes free emergency and medically necessary care in this range. Whether this account receives that help is unknown until Houston Methodist reviews it.",
          mid: "The income entered is above 200% and at or below 500% of the 2026 poverty guideline for a household of {size} (about {percent}% of the guideline). The 200% line is {limit200} and the 500% line is {limit500}. The published policy describes a discount in this range, capped at the average private-insurance and Medicare amount. No single discount percent is published, so no savings amount is shown.",
          above: "The income entered is above 500% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The published policy says people above 500% may still receive a discount. This is not a decision about your account.",
          ten: "The bill amount entered is more than 10% of the annual income entered. The published policy describes that situation, for income above 500% of poverty, as one where a discount may be available.",
          eightLow: "The household size is 8 or more. This site uses the 8-person poverty guideline as the lowest line a household of that size can have. The income entered is at or below 200% of that 8-person line ({limit}). A larger household has a higher line, so the income is still at or below 200%. The hospital needs the exact number of people. Whether the account receives help is unknown.",
          eightUnknown: "The household size is 8 or more, and the income entered is above the 8-person line ({limit200} at 200%, and {limit500} at 500%). A larger household has higher lines, so this site cannot say whether the income is over the published limits. Ask the hospital to screen the exact household size.",
          insPublic: "Your insurance answer is {insurance}. Ask the hospital to bill this coverage and to explain any amount still owed. The income comparison is not a decision about free care.",
          insInsured: "Your insurance answer is Insured. Ask the hospital to bill the insurance and to screen the amount it did not pay. The income comparison is not a promise of free care.",
          insUninsured: "Your insurance answer is Uninsured. Ask whether the care was emergency or medically necessary. The published free-care description is limited to that kind of care."
        },
        memorial: {
          rules: "Memorial Hermann publishes a financial assistance policy for emergency or medically urgent care that is not elective. For an uninsured patient, income at or below 200% of the poverty guidelines is described as free care, a 100% discount, on eligible services. Income above 200% and not more than 400% may receive a discount down to the amounts generally billed to insured patients. The policy does not publish a different percent for that range. Underinsured patients must have insurance billed first. Patients with primary Medicare and secondary Medicaid are described as receiving a 100% discount on the balance left after Medicaid is billed. Financial counselors may set up an extended payment plan. The number of months is not stated in the policy we checked. The policy file lists a review date of October 4, 2022, and the income table posted with it is labeled 2026. Confirm the current policy with the hospital. You can call 713-338-5502.",
          size7: "For a household of 7, Memorial Hermann's posted table lists $50,404 at 100% of poverty. The Federal Register lists $50,040. This screening uses the Federal Register amount.",
          uninsuredLow: "The insurance answer is Uninsured, and the income entered is at or below 200% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The published policy describes a 100% discount for an uninsured patient in this income range, for eligible services, after the hospital reviews the account. This site cannot confirm the type of service or the hospital's decision. Eligibility is unknown.",
          uninsuredMid: "The insurance answer is Uninsured, and the income entered is above 200% and at or below 400% of the 2026 poverty guideline for a household of {size} (about {percent}%). The published policy says this income range may receive a discount to the amounts generally billed to insured patients. No dollar amount is calculated here. Eligibility is unknown.",
          uninsuredAbove: "The insurance answer is Uninsured, and the income entered is above 400% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The published discount range stops at 400%. This is not a finding that help is unavailable. Memorial Hermann makes the decision.",
          otherLow: "The income entered is at or below 200% of the 2026 poverty guideline for a household of {size} ({limit}). The 100% discount at that income level is written for uninsured patients. It is not applied here, because the insurance answer is {insurance}. The policy says insurance must be billed before charity care in underinsured cases. Ask the hospital to bill coverage and then screen any remaining balance. Eligibility is unknown.",
          otherMid: "The income entered is above 200% and at or below 400% of the 2026 poverty guideline for a household of {size} (about {percent}%). The published policy says this range may receive a discount to amounts generally billed, and that insurance must be billed first. The insurance answer is {insurance}. Eligibility is unknown. No savings amount is shown.",
          otherAbove: "The income entered is above 400% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The insurance answer is {insurance}, so the uninsured 100% discount is not applied. The published discount range stops at 400%. This is not a finding that help is unavailable. The hospital makes the decision.",
          eightUninsuredLow: "The household size is 8 or more, and the insurance answer is Uninsured. The income entered is at or below 200% of the 8-person poverty line ({limit}). A larger household has a higher line, so the income is still at or below 200%. The published policy describes a 100% discount for an uninsured patient in that income range, for eligible services, after review. The hospital needs the exact household size. Eligibility is unknown.",
          eightOtherLow: "The household size is 8 or more. The income entered is at or below 200% of the 8-person poverty line ({limit}). The 100% discount at that income level is written for uninsured patients, and the insurance answer is {insurance}, so that discount is not applied here. Ask the hospital to bill coverage and screen any remaining balance. The hospital needs the exact household size. Eligibility is unknown.",
          eightUnknown: "The household size is 8 or more, and the income entered is above the 8-person line ({limit200} at 200%, and {limit400} at 400%). A larger household has higher lines, so this site cannot say whether the income is over the published limits. Ask the hospital to screen the exact household size. Eligibility is unknown.",
          insMedicare: "The policy says patients with primary Medicare and secondary Medicaid receive a 100% discount on the balance left after Medicaid is billed. This form does not know whether Medicaid is also on the account. Ask the hospital. This is not a decision that the discount applies.",
          insMedicaid: "Your insurance answer is Medicaid/CHIP. Ask the hospital to bill that coverage and to explain any amount still owed. The rule for primary Medicare plus secondary Medicaid is not applied, because this form does not know about Medicare.",
          insUnsure: "Your insurance answer is Unsure. The 100% discount written for uninsured patients is not applied, because this form does not know whether the patient is uninsured. Ask the hospital to check coverage."
        },
        harris: {
          rules: "Harris Health publishes a financial assistance program for Harris County residents whose gross household income is at or below 150% of the federal poverty guidelines. People who might get other coverage, such as Medicaid or CHIP, are asked to apply for that coverage first. The program is not an insurance plan. Harris Health may request a copay, such as $3 for a clinic visit, $25 for an emergency room visit, or $50 for an inpatient stay. Its page says care is still given if the copay cannot be paid. There is no fee to apply. Call 713-566-6509. This form does not ask whether you live in Harris County, so it cannot check the residency part of the rule.",
          low: "The income entered is at or below 150% of the 2026 poverty guideline for a household of {size}. That published limit is {limit}. Income is only one part of the published rule. Residency and an application are still required. Eligibility is unknown.",
          above: "The published program says household income may not exceed 150% of the poverty guidelines. For a household of {size}, that line is {limit}. The income entered is above it. This is not a finding that help is unavailable. Harris Health makes the decision. This form also does not know whether you live in Harris County.",
          eightLow: "The household size is 8 or more. The income entered is at or below 150% of the 8-person poverty line ({limit}). A larger household has a higher line, so the income is still at or below 150%. Harris Health also requires Harris County residency, which this form does not collect. Eligibility is unknown.",
          eightUnknown: "The household size is 8 or more, and the income entered is above the 8-person line for 150% of poverty ({limit}). A larger household has a higher line, so this site cannot say whether the income is over the published limit. This form also does not ask whether you live in Harris County. Eligibility is unknown.",
          ins: "Your insurance answer is {insurance}. Harris Health asks people to apply for other coverage when they might be able to get it, so this program is the last option. Ask the hospital what to do next with this coverage."
        },
        tch: {
          rules: "Texas Children's plain-language summary, dated October 2, 2025, describes financial assistance for patients and families who cannot pay some or all of a medically necessary bill. Below 250% of the poverty guidelines, a 100% discount of billed charges may be available. From 251% to 325%, a 75% discount may be available. From 326% to 400%, the summary says the patient should not owe more than the amounts generally billed. A financial assistance deductible may still apply, so this site does not estimate a dollar amount. Government health programs are taken into account. The hospital decides.",
          under250: "The income entered is below 250% of the 2026 poverty guideline for a household of {size} (about {percent}%). The summary says a 100% discount may be available in this range. A deductible may still apply. Eligibility is unknown.",
          mid: "The income entered is between 251% and 325% of the 2026 poverty guideline for a household of {size} (about {percent}%). The summary says a 75% discount may be available. A deductible may still apply, so no dollar amount is estimated. Eligibility is unknown.",
          agb: "The income entered is between 326% and 400% of the 2026 poverty guideline for a household of {size} (about {percent}%). The summary says a patient in this range should not owe more than the amounts generally billed. No dollar cap is calculated here. Eligibility is unknown.",
          above: "The income entered is above 400% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The summary's published ranges stop at 400%. This is not a finding that help is unavailable. Texas Children's makes the decision.",
          gap: "The income entered falls between the ranges written in the October 2, 2025 summary (about {percent}% of the poverty guideline for a household of {size}). Those ranges are below 250%, from 251% to 325%, and from 326% to 400%. Ask the hospital which range it uses. Eligibility is unknown.",
          eightLow: "The household size is 8 or more. The income entered is below 250% of the 8-person poverty line ({limit}). A larger household has a higher line, so the income is still below 250%. The summary says a 100% discount may be available in this range. A deductible may still apply. The hospital needs the exact household size. Eligibility is unknown.",
          eightUnknown: "The household size is 8 or more, and the income entered is not below the 8-person line for 250% of poverty ({limit}). A larger household has higher lines, so this site cannot place the income in a published range. Ask Texas Children's to screen the exact household size. Eligibility is unknown.",
          ins: "Your insurance answer is {insurance}. The summary says government health programs are taken into account. Ask the hospital to bill this coverage and to explain any remaining balance. Eligibility is unknown."
        },
        hca: {
          rules: "HCA Houston Healthcare's public page says that, in most cases, patients from 0% to 200% of the poverty guidelines can receive a 100% charity discount for non-elective care when they provide income documents and do not qualify for state or federal assistance. For balances greater than $1,500, with income from 201% to 400%, an expanded policy may reduce the amount owed. The page says some locations add their own rules. This site does not calculate a write-off. Contact the hospital and ask which location's rules apply.",
          low: "The income entered is at or below 200% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The public page describes a 100% charity discount in most cases for this income range, for non-elective care, with documents, when state or federal assistance does not apply. Eligibility is unknown.",
          midOver: "The income entered is above 200% and at or below 400% of the 2026 poverty guideline for a household of {size} (about {percent}%). The public page says balances greater than $1,500 in this income range may be reduced. The amount entered, {bill}, is above $1,500. Some locations add their own rules. No reduced balance is calculated. Eligibility is unknown.",
          midUnder: "The income entered is above 200% and at or below 400% of the 2026 poverty guideline for a household of {size} (about {percent}%). The expanded policy on the public page is described for balances greater than $1,500. The amount entered, {bill}, is not above $1,500. That does not decide whether the hospital will help. Eligibility is unknown.",
          midEstimate: "The income entered is above 200% and at or below 400% of the 2026 poverty guideline for a household of {size}. The care has not been billed yet, so {bill} is an estimate, not a posted balance. The expanded policy is described for balances greater than $1,500. Ask the hospital how that rule applies before a bill is sent. Eligibility is unknown.",
          above: "The income entered is above 400% of the 2026 poverty guideline for a household of {size}. That line is {limit}. The ranges on the public page stop at 400%. The page also says some locations add their own rules. This is not a finding that help is unavailable. The hospital makes the decision.",
          eightLow: "The household size is 8 or more. The income entered is at or below 200% of the 8-person poverty line ({limit}). A larger household has a higher line, so the income is still at or below 200%. The public page describes a 100% charity discount in most cases for this income range, with the conditions above. The hospital needs the exact household size. Eligibility is unknown.",
          eightUnknown: "The household size is 8 or more, and the income entered is above the 8-person line ({limit200} at 200%, and {limit400} at 400%). A larger household has higher lines, so this site cannot say whether the income is over the published ranges. Ask the hospital to screen the exact household size. Eligibility is unknown.",
          insPublic: "The page describes the 100% charity discount for patients who do not qualify for state or federal assistance. Your insurance answer is {insurance}. Ask the hospital how that coverage affects this bill. This screening does not decide.",
          discount: "HCA's pricing FAQ says uninsured patients who do not meet the charity rules may still receive an uninsured discount, similar to managed care, except for cosmetic procedures and certain package prices. The FAQ does not publish a percent, so no discount amount is shown."
        }
      },
      options: {
        charity: {
          title: "Hospital financial assistance or charity care",
          what: "A hospital program that can reduce or clear a bill for people who cannot pay the full amount. It is sometimes called charity care.",
          why: "Many Houston hospitals have a written policy, but each policy is different. A screening is how you learn how that policy treats this account.",
          next: "Ask for the policy, the application, and the list of documents. Ask the hospital to screen the account. Do not send a Social Security number through this website."
        },
        discount: {
          title: "Uninsured or self-pay discount",
          what: "A price reduction for people paying without insurance, or for a balance insurance did not cover. It is separate from charity care.",
          why: "A discount can lower the balance before a payment plan. The hospital has to say whether one exists and how it is calculated.",
          next: "Ask if an uninsured, self-pay, or prompt-pay discount applies, and ask for any discounted amount in writing."
        },
        itemized: {
          title: "Itemized bill review",
          what: "A list of each charge on the account, instead of only the total.",
          why: "An itemized bill can show duplicate charges or items that do not belong to the visit. You can ask about them before agreeing to the balance.",
          next: "Ask for an itemized bill and for time to review it. Mark anything you do not recognize and ask for an explanation."
        },
        plan: {
          title: "Payment plan",
          what: "A way to pay a remaining balance over time, sometimes without interest.",
          why: "If a balance remains after assistance or a discount, a plan can make the monthly amount easier to pay.",
          next: "Ask whether a plan is available, whether it charges interest, how many months it lasts, and what the monthly payment would be.",
          methodist: "Houston Methodist publishes an interest-free payment plan of up to 18 months. Ask them to set one up if a balance remains. This is not a promise that this account will be put on that plan.",
          memorial: "Memorial Hermann's policy says financial counselors may set up an extended payment plan. The policy we checked does not state a number of months. Ask what terms are available."
        },
        other: {
          title: "Other hospital assistance programs",
          what: "Any extra help the hospital offers besides the financial assistance policy.",
          why: "Some hospitals have more than one way to help. It is reasonable to ask even when a public page does not list a second program.",
          next: "Ask the financial assistance department whether any other program could apply to this account.",
          unknown: "No additional program, beyond the financial assistance policy already described, was confirmed in the sources checked on October 14, 2026.",
          unverified: "This hospital's programs were not confirmed. Ask the financial assistance department what help exists."
        }
      },
      steps: {
        contactPhone: "Contact the financial assistance department at {phone}. Ask for a screening. Have your household size and approximate income ready.",
        contactGeneric: "Contact the hospital's financial assistance department and ask for a screening. Have your household size and approximate income ready.",
        documents: "Ask for the financial assistance policy, the application, and the list of documents they need.",
        itemized: "Ask for an itemized bill.",
        plan: "Ask about discounts and a payment plan, including whether the plan charges interest.",
        collections: "The bill has been sent to collections. Ask the hospital to review the account before collection activity continues, consistent with the hospital's policies and the law.",
        notYet: "The care has not been billed yet. Ask about assistance before the bill is sent.",
        paying: "You are already making payments. Ask whether the remaining balance can still be reviewed for assistance.",
        letter: "Use the letter on the next screen. Review it, copy it, and send it yourself. This website does not send it.",
        harrisCounty: "Ask Harris Health whether you need to show Harris County residency, and which documents prove income.",
        memorialDate: "Ask Memorial Hermann to confirm that the policy you receive is the current one. The file checked here lists a review date of October 4, 2022, with a 2026 poverty table.",
        coverage: "Ask the hospital to bill {insurance} and to explain any amount still owed.",
        insured: "Ask the hospital to bill your insurance and to screen the amount insurance did not pay.",
        hcaLocation: "Ask which HCA Houston location holds the account. The public page says some locations add their own rules."
      },
      letter: {
        title: "Your hospital letter",
        intro: "Read the letter and change anything that is not right. Then copy it and send it yourself.",
        notSent: "This website does not send the letter to the hospital.",
        editLabel: "Letter text",
        copy: "Copy Letter",
        refresh: "Refresh Letter",
        back: "Back to Results",
        langNote: "This letter is written in {language}, because that is the letter language you chose.",
        staleAnswers: "Your answers changed. Refresh the letter if you want it to match the form.",
        staleLang: "The letter language on the form no longer matches this letter. Refresh the letter to rewrite it.",
        copied: "Letter copied. Paste it into an email or a document. This site does not send it to the hospital.",
        copyFail: "The letter could not be copied. Select the text and copy it yourself.",
        refreshConfirm: "Refreshing will replace this letter, including your edits. Continue?",
        invalid: "Fix the form before refreshing the letter. Your current letter was kept.",
        langName: { en: "English", es: "Spanish" }
      },
      letterTemplate: {
        department: "Financial Assistance Department",
        greeting: "Dear Financial Assistance Team,",
        intro: "I am writing to request a review of my medical bill and to ask whether I may qualify for financial assistance, charity care, a discount, or another cost-reduction program.",
        householdCurrent: "My household consists of {size} people, and our approximate annual household income is {income}. My current medical bill is approximately {bill}.",
        householdExpected: "My household consists of {size} people, and our approximate annual household income is {income}. My expected medical bill is approximately {bill}.",
        collections: "This bill has been sent to collections.",
        paying: "I am already making payments on this bill.",
        notYet: "This care is planned and has not been billed yet. If possible, please share this information before the bill is sent.",
        docs: "Please provide your financial assistance policy, application, and list of required supporting documents. I would also appreciate an itemized bill and information about any available discounts or affordable payment plans.",
        collectionsAsk: "If possible, please review my account before initiating or continuing collection activity, consistent with your policies and applicable law.",
        confirm: "Please confirm the next steps and any revised balance in writing.",
        thanks: "Thank you for your time and consideration.",
        closing: "Sincerely,",
        blankName: "________________________"
      },
      footer: {
        note: "CarePath Houston is a free informational tool for families in the Houston area. It does not decide eligibility, give legal or medical advice, or send your information to a hospital. Do not enter Social Security numbers, medical record numbers, or diagnoses."
      }
    },
    es: {
      meta: {
        title: "CarePath Houston",
        description: "CarePath Houston ayuda a las familias a revisar opciones para facturas del hospital y a escribir una solicitud de asistencia financiera. No decide la elegibilidad."
      },
      skip: "Saltar al contenido",
      brand: { tag: "Ayuda con facturas del hospital" },
      lang: { group: "Idioma" },
      nav: {
        label: "Principal",
        home: "Inicio",
        form: "Su información",
        results: "Resultados",
        letter: "Carta",
        resultsLocked: "Resultados, disponible después de enviar el formulario",
        letterLocked: "Carta, disponible después de enviar el formulario"
      },
      home: {
        eyebrow: "Para familias en Houston",
        headline: "Un camino claro hacia la atención asequible",
        photoAlt: "Pacientes sonriendo juntos en una sala luminosa del hospital.",
        support: "Averigüe si podría calificar para asistencia financiera del hospital, descuentos o un plan de pago más accesible.",
        cta: "Revisar mis opciones",
        reassure: "Es gratis. No necesita una cuenta. Disponible en inglés y en español.",
        feature1Title: "Entienda sus opciones",
        feature1Text: "Conozca posibles formas de ayuda con la factura médica.",
        feature2Title: "Encuentre ayuda financiera",
        feature2Text: "Sepa qué preguntarle a su hospital.",
        feature3Title: "Obtenga una carta lista para usar",
        feature3Text: "Cree una solicitud personalizada de asistencia financiera.",
        howTitle: "Cómo funciona",
        step1: "Cuéntenos sobre su hogar.",
        step2: "Revise posibles opciones de asistencia.",
        step3: "Cree una carta para su hospital."
      },
      form: {
        title: "Cuéntenos sobre su hogar",
        intro: "Use sus mejores estimados. Cada hospital tiene sus propias reglas, y esta página no decide si usted califica.",
        privacy: "No escriba un número de Seguro Social, un número de expediente médico, un diagnóstico ni un número de cuenta. Sus respuestas se quedan en este dispositivo hasta que cierre la página. No se envían a un hospital. Esto no es consejo legal, financiero ni médico, y no es un servicio de HIPAA.",
        requiredNote: "Los campos con * son obligatorios.",
        hospital: {
          legend: "Información del hospital",
          label: "Hospital o sistema de salud *",
          help: "Cada hospital escribe sus propias reglas de asistencia financiera. Esta lista no significa que las reglas sean iguales.",
          placeholder: "Elija un hospital",
          houstonMethodist: "Houston Methodist",
          memorialHermann: "Memorial Hermann",
          harrisHealth: "Harris Health System",
          texasChildrens: "Texas Children's Hospital",
          hcaHouston: "HCA Houston Healthcare",
          other: "Otro hospital del área de Houston"
        },
        other: {
          label: "Nombre del hospital *",
          help: "Este nombre se usa en sus resultados y en su carta."
        },
        household: {
          legend: "Información del hogar",
          size: "Tamaño del hogar *",
          sizeHelp: "Cuente a las personas que viven juntas y comparten ingresos y gastos. Si son más de 8, elija 8+.",
          placeholder: "Elija el tamaño del hogar",
          eightPlus: "8 o más"
        },
        income: {
          label: "Ingreso anual total del hogar (dólares de EE. UU.) *",
          help: "Un estimado del año, antes de impuestos, está bien. Incluya el ingreso de las personas del hogar."
        },
        bill: {
          legend: "Información de la factura médica",
          amount: "Factura médica aproximada (dólares de EE. UU.) *",
          amountHelp: "La cantidad que todavía debe, o su mejor estimado si la factura no ha llegado."
        },
        insurance: {
          label: "Seguro médico *",
          help: "Elija la opción que mejor describa al paciente. Si no está seguro, elija No estoy seguro.",
          placeholder: "Elija el tipo de seguro",
          uninsured: "Sin seguro",
          insured: "Con seguro",
          medicaid: "Medicaid/CHIP",
          medicare: "Medicare",
          unsure: "No estoy seguro"
        },
        billStatus: {
          label: "Estado de la factura *",
          help: "Esto ayuda a redactar su carta. No decide si el hospital va a ayudar.",
          placeholder: "Elija el estado de la factura",
          justReceived: "Acabo de recibir la factura",
          paying: "Ya estoy haciendo pagos",
          collections: "Enviada a cobranza",
          notYetBilled: "La atención está planeada, pero todavía no hay factura"
        },
        letter: { legend: "Información para la carta" },
        name: {
          label: "Nombre para la carta (opcional)",
          help: "Solo se usa para firmar la carta en este dispositivo. Déjelo en blanco si prefiere."
        },
        letterLang: {
          label: "Idioma de la carta",
          help: "La carta usa este idioma aunque el resto del sitio esté en el otro idioma.",
          en: "Inglés",
          es: "Español"
        },
        submit: "Ver mis opciones",
        submitHelp: "Puede regresar y cambiar estas respuestas. No se guardan después de cerrar la página."
      },
      errors: {
        summary: "Corrija los campos marcados.",
        hospital: "Elija un hospital.",
        other: "Escriba el nombre del hospital.",
        household: "Elija el tamaño del hogar.",
        incomeRequired: "Escriba el ingreso anual del hogar.",
        incomeNumber: "Use solo números para el ingreso.",
        incomeNegative: "El ingreso no puede ser negativo.",
        incomeCents: "Use dólares y centavos, con no más de dos decimales.",
        billRequired: "Escriba el monto aproximado de la factura.",
        billNumber: "Use solo números para la factura.",
        billNegative: "La factura no puede ser un número negativo.",
        billCents: "Use dólares y centavos, con no más de dos decimales.",
        insurance: "Elija el estado del seguro.",
        billStatus: "Elija el estado de la factura."
      },
      results: {
        title: "Posibles opciones de asistencia",
        intro: "Estas notas explican lo que el hospital ha publicado y lo que usted puede preguntar. No son una decisión sobre su cuenta.",
        unknownBanner: "Resultado de elegibilidad: desconocido. Esta revisión no decide si la asistencia será aprobada. El hospital toma esa decisión.",
        unverified: "No pudimos confirmar los requisitos actuales de elegibilidad de este hospital. Es posible que usted todavía califique para asistencia. Comuníquese con el departamento de asistencia financiera del hospital para pedir una evaluación.",
        disclaimer: "Esta es una revisión informativa, no una garantía de elegibilidad ni la decisión final del hospital. El hospital determina la elegibilidad real y los montos de asistencia.",
        summaryTitle: "Lo que usted escribió",
        hospital: "Hospital",
        household: "Tamaño del hogar",
        income: "Ingreso anual",
        bill: "Factura médica",
        insurance: "Seguro",
        billStatus: "Estado de la factura",
        confirmedHeading: "Información confirmada de la política",
        compareHeading: "Cómo se comparan sus números",
        notADecision: "Esta comparación no es una decisión. El hospital decide quién recibe ayuda y de cuánto.",
        checked: "Fuentes revisadas el 14 de octubre de 2026.",
        fplNote: "Los límites de ingreso usan las guías federales de pobreza de 2026 para los 48 estados contiguos y el Distrito de Columbia.",
        newTab: "se abre en una pestaña nueva",
        optionsHeading: "Opciones para preguntar",
        stepsHeading: "Próximos pasos recomendados",
        what: "Qué es",
        why: "Por qué preguntar",
        next: "Qué hacer después",
        status: {
          confirmed: "Información confirmada de la política",
          possible: "Posible opción para preguntar",
          unknown: "Resultado de elegibilidad desconocido"
        },
        generate: "Crear mi carta para el hospital",
        edit: "Editar mis respuestas",
        startOver: "Empezar de nuevo"
      },
      sources: {
        fpl: "Guías federales de pobreza de 2026 (Federal Register)",
        methodistPage: "Políticas de asistencia financiera de Houston Methodist",
        memorialPolicy: "Política de asistencia financiera de Memorial Hermann",
        memorialTable: "Tabla de ingresos de 2026 de Memorial Hermann",
        harrisPage: "Página de elegibilidad de Harris Health",
        harrisCopay: "Tabla de copagos de Harris Health",
        tchSummary: "Resumen en lenguaje sencillo de Texas Children's (2 de octubre de 2025)",
        tchPage: "Página de asistencia financiera de Texas Children's",
        hcaPage: "Página de asistencia financiera de HCA Houston Healthcare",
        hcaFaq: "Preguntas frecuentes de precios de HCA Houston Healthcare"
      },
      policy: {
        methodist: {
          rules: "Houston Methodist publica una política de asistencia financiera. Con un ingreso familiar de hasta el 200% de las guías federales de pobreza, la política describe atención de emergencia y médicamente necesaria sin costo. Por encima del 200% y hasta el 500%, describe un descuento limitado al promedio de lo que pagan el seguro privado y Medicare. No publica un solo porcentaje de descuento para ese rango, así que este sitio no calcula uno. Por encima del 500%, todavía puede haber un descuento, incluso cuando la factura es más del 10% del ingreso familiar. El hospital también ofrece un plan de pago sin interés de hasta 18 meses. La política está escrita para personas sin seguro, con seguro insuficiente, que no califican para un programa del gobierno, o que no pueden pagar. Puede pedir la política y la solicitud en el sitio del hospital, en admisión y registro, o llamando al 877-493-3228 (sin costo) o al 832-667-5900 (local).",
          low: "El ingreso escrito está en o por debajo del 200% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. La política publicada describe atención de emergencia y médicamente necesaria sin costo en este rango. No se sabe si esta cuenta recibirá esa ayuda hasta que Houston Methodist la revise.",
          mid: "El ingreso escrito está por encima del 200% y en o por debajo del 500% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}% de la guía). El límite del 200% es {limit200} y el del 500% es {limit500}. La política describe un descuento en este rango, limitado al promedio de lo que pagan el seguro privado y Medicare. No hay un solo porcentaje publicado, así que no se muestra un ahorro.",
          above: "El ingreso escrito está por encima del 500% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. La política dice que las personas por encima del 500% todavía pueden recibir un descuento. Esto no es una decisión sobre su cuenta.",
          ten: "El monto de la factura es más del 10% del ingreso anual escrito. La política describe esa situación, cuando el ingreso está por encima del 500% de la pobreza, como un caso en el que puede haber un descuento.",
          eightLow: "El hogar tiene 8 personas o más. Este sitio usa la guía de 8 personas como el límite más bajo para un hogar de ese tamaño. El ingreso escrito está en o por debajo del 200% de esa línea de 8 personas ({limit}). Un hogar más grande tiene un límite más alto, así que el ingreso sigue estando en o por debajo del 200%. El hospital necesita el número exacto de personas. No se sabe si la cuenta recibirá ayuda.",
          eightUnknown: "El hogar tiene 8 personas o más, y el ingreso escrito está por encima de la línea de 8 personas ({limit200} al 200% y {limit500} al 500%). Un hogar más grande tiene límites más altos, así que este sitio no puede decir si el ingreso pasa los límites publicados. Pida al hospital que revise el tamaño exacto del hogar.",
          insPublic: "Su respuesta sobre el seguro es {insurance}. Pida al hospital que cobre a esa cobertura y que explique cualquier cantidad que todavía deba. La comparación de ingreso no es una decisión sobre atención sin costo.",
          insInsured: "Su respuesta sobre el seguro es Con seguro. Pida al hospital que cobre al seguro y que revise la cantidad que el seguro no pagó. La comparación de ingreso no es una promesa de atención sin costo.",
          insUninsured: "Su respuesta sobre el seguro es Sin seguro. Pregunte si la atención fue de emergencia o médicamente necesaria. La descripción de atención sin costo se limita a ese tipo de atención."
        },
        memorial: {
          rules: "Memorial Hermann publica una política de asistencia financiera para atención de emergencia o médicamente urgente que no es electiva. Para un paciente sin seguro, un ingreso de hasta el 200% de las guías de pobreza se describe como atención sin costo, un descuento del 100%, en servicios que califican. Un ingreso por encima del 200% y hasta el 400% puede recibir un descuento hasta los montos que normalmente se cobran a pacientes con seguro. La política no publica otro porcentaje para ese rango. Si la persona tiene seguro insuficiente, primero se debe cobrar al seguro. Los pacientes con Medicare primario y Medicaid secundario se describen con un descuento del 100% sobre el saldo que queda después de cobrar a Medicaid. Los consejeros financieros pueden crear un plan de pago extendido. La política que revisamos no dice cuántos meses. El archivo de la política tiene fecha de revisión del 4 de octubre de 2022, y la tabla de ingresos que la acompaña está marcada como 2026. Confirme la política actual con el hospital. Puede llamar al 713-338-5502.",
          size7: "Para un hogar de 7 personas, la tabla publicada de Memorial Hermann muestra $50,404 al 100% de la pobreza. El Federal Register muestra $50,040. Esta revisión usa la cantidad del Federal Register.",
          uninsuredLow: "La respuesta sobre el seguro es Sin seguro, y el ingreso escrito está en o por debajo del 200% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. La política describe un descuento del 100% para un paciente sin seguro en este rango de ingreso, para servicios que califican, después de que el hospital revise la cuenta. Este sitio no puede confirmar el tipo de servicio ni la decisión del hospital. La elegibilidad es desconocida.",
          uninsuredMid: "La respuesta sobre el seguro es Sin seguro, y el ingreso escrito está por encima del 200% y en o por debajo del 400% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). La política dice que este rango puede recibir un descuento hasta los montos que normalmente se cobran a pacientes con seguro. Aquí no se calcula una cantidad en dólares. La elegibilidad es desconocida.",
          uninsuredAbove: "La respuesta sobre el seguro es Sin seguro, y el ingreso escrito está por encima del 400% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. El rango de descuento publicado termina en el 400%. Esto no significa que no haya ayuda. Memorial Hermann toma la decisión.",
          otherLow: "El ingreso escrito está en o por debajo del 200% de la guía de pobreza de 2026 para un hogar de {size} ({limit}). El descuento del 100% en ese nivel de ingreso está escrito para pacientes sin seguro. No se aplica aquí, porque la respuesta sobre el seguro es {insurance}. La política dice que primero se debe cobrar al seguro cuando la cobertura es insuficiente. Pida al hospital que cobre a la cobertura y luego revise cualquier saldo. La elegibilidad es desconocida.",
          otherMid: "El ingreso escrito está por encima del 200% y en o por debajo del 400% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). La política dice que este rango puede recibir un descuento hasta los montos generalmente cobrados, y que primero se debe cobrar al seguro. La respuesta sobre el seguro es {insurance}. La elegibilidad es desconocida. No se muestra un ahorro.",
          otherAbove: "El ingreso escrito está por encima del 400% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. La respuesta sobre el seguro es {insurance}, así que no se aplica el descuento del 100% para personas sin seguro. El rango publicado termina en el 400%. Esto no significa que no haya ayuda. El hospital toma la decisión.",
          eightUninsuredLow: "El hogar tiene 8 personas o más, y la respuesta sobre el seguro es Sin seguro. El ingreso escrito está en o por debajo del 200% de la línea de pobreza de 8 personas ({limit}). Un hogar más grande tiene un límite más alto, así que el ingreso sigue estando en o por debajo del 200%. La política describe un descuento del 100% para un paciente sin seguro en ese rango, para servicios que califican, después de la revisión. El hospital necesita el tamaño exacto del hogar. La elegibilidad es desconocida.",
          eightOtherLow: "El hogar tiene 8 personas o más. El ingreso escrito está en o por debajo del 200% de la línea de pobreza de 8 personas ({limit}). El descuento del 100% en ese nivel está escrito para pacientes sin seguro, y la respuesta sobre el seguro es {insurance}, así que ese descuento no se aplica aquí. Pida al hospital que cobre a la cobertura y revise cualquier saldo. El hospital necesita el tamaño exacto del hogar. La elegibilidad es desconocida.",
          eightUnknown: "El hogar tiene 8 personas o más, y el ingreso escrito está por encima de la línea de 8 personas ({limit200} al 200% y {limit400} al 400%). Un hogar más grande tiene límites más altos, así que este sitio no puede decir si el ingreso pasa los límites publicados. Pida al hospital que revise el tamaño exacto del hogar. La elegibilidad es desconocida.",
          insMedicare: "La política dice que los pacientes con Medicare primario y Medicaid secundario reciben un descuento del 100% sobre el saldo que queda después de cobrar a Medicaid. Este formulario no sabe si también hay Medicaid en la cuenta. Pregunte al hospital. Esto no decide que el descuento se aplique.",
          insMedicaid: "Su respuesta sobre el seguro es Medicaid/CHIP. Pida al hospital que cobre a esa cobertura y que explique cualquier cantidad que todavía deba. No se aplica la regla de Medicare primario más Medicaid secundario, porque este formulario no sabe si hay Medicare.",
          insUnsure: "Su respuesta sobre el seguro es No estoy seguro. No se aplica el descuento del 100% escrito para pacientes sin seguro, porque este formulario no sabe si el paciente está sin seguro. Pida al hospital que revise la cobertura."
        },
        harris: {
          rules: "Harris Health publica un programa de asistencia financiera para residentes del Condado de Harris cuyo ingreso bruto del hogar está en o por debajo del 150% de las guías federales de pobreza. A las personas que podrían obtener otra cobertura, como Medicaid o CHIP, se les pide que soliciten esa cobertura primero. El programa no es un seguro. Harris Health puede pedir un copago, como $3 por una visita a la clínica, $25 por una visita a la sala de emergencias, o $50 por una hospitalización. Su página dice que la atención se da aunque la persona no pueda pagar el copago. No hay tarifa para solicitar. Llame al 713-566-6509. Este formulario no pregunta si usted vive en el Condado de Harris, así que no puede revisar esa parte de la regla.",
          low: "El ingreso escrito está en o por debajo del 150% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite publicado es {limit}. El ingreso es solo una parte de la regla. Todavía se necesitan la residencia y una solicitud. La elegibilidad es desconocida.",
          above: "El programa publicado dice que el ingreso del hogar no puede pasar del 150% de las guías de pobreza. Para un hogar de {size}, ese límite es {limit}. El ingreso escrito está por encima. Esto no significa que no haya ayuda. Harris Health toma la decisión. Este formulario tampoco sabe si usted vive en el Condado de Harris.",
          eightLow: "El hogar tiene 8 personas o más. El ingreso escrito está en o por debajo del 150% de la línea de pobreza de 8 personas ({limit}). Un hogar más grande tiene un límite más alto, así que el ingreso sigue estando en o por debajo del 150%. Harris Health también pide residencia en el Condado de Harris, y este formulario no la recoge. La elegibilidad es desconocida.",
          eightUnknown: "El hogar tiene 8 personas o más, y el ingreso escrito está por encima de la línea de 8 personas para el 150% de la pobreza ({limit}). Un hogar más grande tiene un límite más alto, así que este sitio no puede decir si el ingreso pasa el límite publicado. Este formulario tampoco pregunta si usted vive en el Condado de Harris. La elegibilidad es desconocida.",
          ins: "Su respuesta sobre el seguro es {insurance}. Harris Health pide que las personas soliciten otra cobertura cuando puedan obtenerla, para que este programa sea la última opción. Pregunte al hospital qué hacer con esta cobertura."
        },
        tch: {
          rules: "El resumen en lenguaje sencillo de Texas Children's, con fecha del 2 de octubre de 2025, describe asistencia financiera para pacientes y familias que no pueden pagar parte o toda una factura por atención médicamente necesaria. Por debajo del 250% de las guías de pobreza, puede haber un descuento del 100% de los cargos facturados. Del 251% al 325%, puede haber un descuento del 75%. Del 326% al 400%, el resumen dice que el paciente no debería deber más que los montos generalmente cobrados. Todavía puede haber un deducible de asistencia financiera, así que este sitio no calcula una cantidad en dólares. Se toman en cuenta los programas de salud del gobierno. El hospital decide.",
          under250: "El ingreso escrito está por debajo del 250% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). El resumen dice que puede haber un descuento del 100% en este rango. Todavía puede haber un deducible. La elegibilidad es desconocida.",
          mid: "El ingreso escrito está entre el 251% y el 325% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). El resumen dice que puede haber un descuento del 75%. Todavía puede haber un deducible, así que no se calcula una cantidad. La elegibilidad es desconocida.",
          agb: "El ingreso escrito está entre el 326% y el 400% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). El resumen dice que un paciente en este rango no debería deber más que los montos generalmente cobrados. Aquí no se calcula un tope en dólares. La elegibilidad es desconocida.",
          above: "El ingreso escrito está por encima del 400% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. Los rangos publicados del resumen terminan en el 400%. Esto no significa que no haya ayuda. Texas Children's toma la decisión.",
          gap: "El ingreso escrito cae entre los rangos del resumen del 2 de octubre de 2025 (cerca del {percent}% de la guía de pobreza para un hogar de {size}). Esos rangos son por debajo del 250%, del 251% al 325%, y del 326% al 400%. Pregunte al hospital qué rango usa. La elegibilidad es desconocida.",
          eightLow: "El hogar tiene 8 personas o más. El ingreso escrito está por debajo del 250% de la línea de pobreza de 8 personas ({limit}). Un hogar más grande tiene un límite más alto, así que el ingreso sigue estando por debajo del 250%. El resumen dice que puede haber un descuento del 100% en este rango. Todavía puede haber un deducible. El hospital necesita el tamaño exacto del hogar. La elegibilidad es desconocida.",
          eightUnknown: "El hogar tiene 8 personas o más, y el ingreso escrito no está por debajo de la línea de 8 personas para el 250% de la pobreza ({limit}). Un hogar más grande tiene límites más altos, así que este sitio no puede colocar el ingreso en un rango publicado. Pida a Texas Children's que revise el tamaño exacto del hogar. La elegibilidad es desconocida.",
          ins: "Su respuesta sobre el seguro es {insurance}. El resumen dice que se toman en cuenta los programas de salud del gobierno. Pida al hospital que cobre a esta cobertura y que explique cualquier saldo. La elegibilidad es desconocida."
        },
        hca: {
          rules: "La página pública de HCA Houston Healthcare dice que, en la mayoría de los casos, los pacientes entre el 0% y el 200% de las guías de pobreza pueden recibir un descuento de caridad del 100% por atención no electiva cuando presentan documentos de ingreso y no califican para asistencia estatal o federal. Para saldos mayores de $1,500, con ingreso del 201% al 400%, una política ampliada puede reducir la cantidad adeudada. La página dice que algunos lugares añaden sus propias reglas. Este sitio no calcula una condonación. Comuníquese con el hospital y pregunte qué reglas usa ese lugar.",
          low: "El ingreso escrito está en o por debajo del 200% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. La página pública describe un descuento de caridad del 100%, en la mayoría de los casos, para este rango de ingreso, para atención no electiva, con documentos, cuando no hay asistencia estatal o federal. La elegibilidad es desconocida.",
          midOver: "El ingreso escrito está por encima del 200% y en o por debajo del 400% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). La página pública dice que los saldos mayores de $1,500 en este rango pueden reducirse. La cantidad escrita, {bill}, es mayor de $1,500. Algunos lugares añaden sus propias reglas. No se calcula un saldo reducido. La elegibilidad es desconocida.",
          midUnder: "El ingreso escrito está por encima del 200% y en o por debajo del 400% de la guía de pobreza de 2026 para un hogar de {size} (cerca del {percent}%). La política ampliada de la página pública se describe para saldos mayores de $1,500. La cantidad escrita, {bill}, no es mayor de $1,500. Eso no decide si el hospital va a ayudar. La elegibilidad es desconocida.",
          midEstimate: "El ingreso escrito está por encima del 200% y en o por debajo del 400% de la guía de pobreza de 2026 para un hogar de {size}. La atención todavía no se ha facturado, así que {bill} es un estimado, no un saldo publicado. La política ampliada se describe para saldos mayores de $1,500. Pregunte al hospital cómo se aplica esa regla antes de que envíen la factura. La elegibilidad es desconocida.",
          above: "El ingreso escrito está por encima del 400% de la guía de pobreza de 2026 para un hogar de {size}. Ese límite es {limit}. Los rangos de la página pública terminan en el 400%. La página también dice que algunos lugares añaden sus propias reglas. Esto no significa que no haya ayuda. El hospital toma la decisión.",
          eightLow: "El hogar tiene 8 personas o más. El ingreso escrito está en o por debajo del 200% de la línea de pobreza de 8 personas ({limit}). Un hogar más grande tiene un límite más alto, así que el ingreso sigue estando en o por debajo del 200%. La página pública describe un descuento de caridad del 100%, en la mayoría de los casos, para este rango, con las condiciones de arriba. El hospital necesita el tamaño exacto del hogar. La elegibilidad es desconocida.",
          eightUnknown: "El hogar tiene 8 personas o más, y el ingreso escrito está por encima de la línea de 8 personas ({limit200} al 200% y {limit400} al 400%). Un hogar más grande tiene límites más altos, así que este sitio no puede decir si el ingreso pasa los rangos publicados. Pida al hospital que revise el tamaño exacto del hogar. La elegibilidad es desconocida.",
          insPublic: "La página describe el descuento de caridad del 100% para pacientes que no califican para asistencia estatal o federal. Su respuesta sobre el seguro es {insurance}. Pregunte al hospital cómo afecta esa cobertura a esta factura. Esta revisión no decide.",
          discount: "Las preguntas frecuentes de precios de HCA dicen que los pacientes sin seguro que no cumplen las reglas de caridad todavía pueden recibir un descuento para personas sin seguro, parecido al de los seguros, excepto en procedimientos cosméticos y ciertos precios de paquete. No publican un porcentaje, así que no se muestra un monto de descuento."
        }
      },
      options: {
        charity: {
          title: "Asistencia financiera del hospital o atención benéfica",
          what: "Un programa del hospital que puede reducir o cancelar una factura para personas que no pueden pagar el total. A veces se llama charity care o atención benéfica.",
          why: "Muchos hospitales de Houston tienen una política escrita, pero cada política es distinta. Una evaluación es la forma de saber cómo trata esa política esta cuenta.",
          next: "Pida la política, la solicitud y la lista de documentos. Pida al hospital que revise la cuenta. No envíe un número de Seguro Social por este sitio web."
        },
        discount: {
          title: "Descuento para personas sin seguro o de pago propio",
          what: "Una reducción de precio para quien paga sin seguro, o para un saldo que el seguro no cubrió. Es distinto de la atención benéfica.",
          why: "Un descuento puede bajar el saldo antes de un plan de pago. El hospital tiene que decir si existe y cómo se calcula.",
          next: "Pregunte si aplica un descuento para personas sin seguro, de pago propio o por pagar pronto, y pida cualquier monto con descuento por escrito."
        },
        itemized: {
          title: "Revisión de la factura detallada",
          what: "Una lista de cada cargo de la cuenta, no solo el total.",
          why: "Una factura detallada puede mostrar cargos duplicados o artículos que no corresponden a la visita. Usted puede preguntar antes de aceptar el saldo.",
          next: "Pida una factura detallada y tiempo para revisarla. Marque lo que no reconozca y pida una explicación."
        },
        plan: {
          title: "Plan de pago",
          what: "Una forma de pagar el saldo que quede a lo largo del tiempo, a veces sin interés.",
          why: "Si queda un saldo después de la asistencia o un descuento, un plan puede hacer más fácil el pago mensual.",
          next: "Pregunte si hay un plan, si cobra interés, cuántos meses dura y cuál sería el pago mensual.",
          methodist: "Houston Methodist publica un plan de pago sin interés de hasta 18 meses. Pida que lo preparen si queda un saldo. Esto no promete que esta cuenta entre en ese plan.",
          memorial: "La política de Memorial Hermann dice que los consejeros financieros pueden crear un plan de pago extendido. La política que revisamos no dice cuántos meses. Pregunte qué condiciones hay."
        },
        other: {
          title: "Otros programas de asistencia del hospital",
          what: "Cualquier ayuda adicional que el hospital ofrezca además de la política de asistencia financiera.",
          why: "Algunos hospitales tienen más de una forma de ayudar. Es razonable preguntar aunque una página pública no liste un segundo programa.",
          next: "Pregunte al departamento de asistencia financiera si algún otro programa podría aplicar a esta cuenta.",
          unknown: "No se confirmó ningún programa adicional, aparte de la política de asistencia financiera ya descrita, en las fuentes revisadas el 14 de octubre de 2026.",
          unverified: "No se confirmaron los programas de este hospital. Pregunte al departamento de asistencia financiera qué ayuda existe."
        }
      },
      steps: {
        contactPhone: "Comuníquese con el departamento de asistencia financiera al {phone}. Pida una evaluación. Tenga a la mano el tamaño de su hogar y un ingreso aproximado.",
        contactGeneric: "Comuníquese con el departamento de asistencia financiera del hospital y pida una evaluación. Tenga a la mano el tamaño de su hogar y un ingreso aproximado.",
        documents: "Pida la política de asistencia financiera, la solicitud y la lista de documentos que necesitan.",
        itemized: "Pida una factura detallada.",
        plan: "Pregunte por descuentos y por un plan de pago, incluso si el plan cobra interés.",
        collections: "La factura fue enviada a cobranza. Pida al hospital que revise la cuenta antes de que continúe la cobranza, de acuerdo con las políticas del hospital y la ley.",
        notYet: "La atención todavía no se ha facturado. Pregunte por la asistencia antes de que envíen la factura.",
        paying: "Usted ya está haciendo pagos. Pregunte si el saldo que queda todavía puede revisarse para asistencia.",
        letter: "Use la carta de la siguiente pantalla. Revísela, cópiela y envíela usted mismo. Este sitio web no la envía.",
        harrisCounty: "Pregunte a Harris Health si necesita mostrar residencia en el Condado de Harris y qué documentos prueban el ingreso.",
        memorialDate: "Pida a Memorial Hermann que confirme que la política que le den es la actual. El archivo revisado aquí tiene fecha de revisión del 4 de octubre de 2022, con una tabla de pobreza de 2026.",
        coverage: "Pida al hospital que cobre a {insurance} y que explique cualquier cantidad que todavía deba.",
        insured: "Pida al hospital que cobre a su seguro y que revise la cantidad que el seguro no pagó.",
        hcaLocation: "Pregunte qué localidad de HCA Houston tiene la cuenta. La página pública dice que algunos lugares añaden sus propias reglas."
      },
      letter: {
        title: "Su carta para el hospital",
        intro: "Lea la carta y cambie cualquier cosa que no esté correcta. Luego cópiela y envíela usted mismo.",
        notSent: "Este sitio web no envía la carta al hospital.",
        editLabel: "Texto de la carta",
        copy: "Copiar carta",
        refresh: "Actualizar carta",
        back: "Volver a los resultados",
        langNote: "Esta carta está en {language}, porque ese es el idioma que usted eligió para la carta.",
        staleAnswers: "Sus respuestas cambiaron. Actualice la carta si quiere que coincida con el formulario.",
        staleLang: "El idioma de la carta en el formulario ya no coincide con esta carta. Actualice la carta para volver a escribirla.",
        copied: "Carta copiada. Péguela en un correo o en un documento. Este sitio no la envía al hospital.",
        copyFail: "No se pudo copiar la carta. Seleccione el texto y cópielo usted mismo.",
        refreshConfirm: "Actualizar reemplazará esta carta, incluidos sus cambios. ¿Desea continuar?",
        invalid: "Corrija el formulario antes de actualizar la carta. Su carta actual se conservó.",
        langName: { en: "inglés", es: "español" }
      },
      letterTemplate: {
        department: "Departamento de asistencia financiera",
        greeting: "Estimado equipo de asistencia financiera:",
        intro: "Les escribo para pedir una revisión de mi factura médica y para preguntar si puedo calificar para asistencia financiera, atención benéfica (charity care), un descuento u otro programa que reduzca el costo.",
        householdCurrent: "Mi hogar tiene {size} personas, y nuestro ingreso anual aproximado del hogar es {income}. Mi factura médica actual es de aproximadamente {bill}.",
        householdExpected: "Mi hogar tiene {size} personas, y nuestro ingreso anual aproximado del hogar es {income}. Mi factura médica prevista es de aproximadamente {bill}.",
        collections: "Esta factura fue enviada a cobranza.",
        paying: "Ya estoy haciendo pagos de esta factura.",
        notYet: "Esta atención está planeada y todavía no ha sido facturada. Si es posible, compartan esta información antes de enviar la factura.",
        docs: "Por favor envíenme su política de asistencia financiera, la solicitud y la lista de documentos que debo presentar. También les agradecería una factura detallada e información sobre cualquier descuento o plan de pago accesible.",
        collectionsAsk: "Si es posible, revisen mi cuenta antes de iniciar o continuar una cobranza, de acuerdo con sus políticas y la ley aplicable.",
        confirm: "Por favor confirmen por escrito los próximos pasos y cualquier saldo revisado.",
        thanks: "Gracias por su tiempo y consideración.",
        closing: "Atentamente,",
        blankName: "________________________"
      },
      footer: {
        note: "CarePath Houston es una herramienta informativa y gratuita para familias del área de Houston. No decide la elegibilidad, no da consejo legal ni médico, y no envía su información a un hospital. No escriba números de Seguro Social, números de expediente médico ni diagnósticos."
      }
    }
  };

  var state = {
    lang: "en",
    screen: "home",
    submitted: false,
    errorKeys: {},
    letterGenerated: false,
    letterEdited: false,
    letterBaseline: "",
    letterSignature: "",
    letterSourceLang: "en"
  };

  var ERROR_FIELDS = ["hospital", "other", "household", "income", "bill", "insurance", "billStatus"];
  var ERROR_NODES = {
    hospital: "hospital-error",
    other: "other-error",
    household: "household-error",
    income: "income-error",
    bill: "bill-error",
    insurance: "insurance-error",
    billStatus: "bill-status-error"
  };
  var ERROR_INPUTS = {
    hospital: "hospital",
    other: "other-hospital",
    household: "household-size",
    income: "income",
    bill: "bill-amount",
    insurance: "insurance",
    billStatus: "bill-status"
  };

  function t(key, vars) {
    var node = translations[state.lang];
    var parts = key.split(".");
    var i;
    for (i = 0; i < parts.length; i += 1) {
      if (!node || typeof node !== "object" || !Object.prototype.hasOwnProperty.call(node, parts[i])) {
        return key;
      }
      node = node[parts[i]];
    }
    if (typeof node !== "string") return key;
    if (!vars) return node;
    return node.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  function dict(lang) {
    return translations[lang] || translations.en;
  }

  function formatMoney(amount) {
    var cents = Math.round(Number(amount) * 100);
    var hasCents = cents % 100 !== 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0
    }).format(cents / 100);
  }

  function formatPercent(value) {
    var rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function incomeCents(amount) {
    return Math.round(Number(amount) * 100);
  }

  function sizeLabel(size) {
    if (size === "8plus") return t("form.household.eightPlus");
    return String(size);
  }

  function cutoffDollars(size, percent) {
    var used = size === "8plus" ? 8 : size;
    return (FPL_2026[used] * percent) / 100;
  }

  /* atOrBelow is certain for 8+ because a larger household has a higher line.
     above is used only for an exact household size of 1 through 7. */
  function comparePercent(income, size, percent) {
    var used = size === "8plus" ? 8 : size;
    var atOrBelow = incomeCents(income) <= FPL_2026[used] * percent;
    if (atOrBelow) return "atOrBelow";
    if (size === "8plus") return "indeterminate";
    return "above";
  }

  function povertyRatio(income, size) {
    if (size === "8plus") return null;
    return (Number(income) / FPL_2026[size]) * 100;
  }

  function bandThrough(income, size, lowMax, midMax) {
    if (comparePercent(income, size, lowMax) === "atOrBelow") return "low";
    if (size === "8plus") return "indeterminate";
    if (comparePercent(income, size, midMax) === "atOrBelow") return "mid";
    return "high";
  }

  function texasBand(income, size) {
    if (size === "8plus") {
      return incomeCents(income) < FPL_2026[8] * 250 ? "under250" : "indeterminate";
    }
    var base = FPL_2026[size];
    var cents = incomeCents(income);
    if (cents < base * 250) return "under250";
    if (cents >= base * 251 && cents <= base * 325) return "mid";
    if (cents >= base * 326 && cents <= base * 400) return "agb";
    if (cents > base * 400) return "above";
    return "gap";
  }

  function sanitizeMoney(value) {
    var cleaned = String(value).replace(/[^\d.]/g, "");
    var parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    return cleaned;
  }

  function parseMoney(raw) {
    var trimmed = String(raw || "").trim();
    if (!trimmed) return { empty: true };
    if (trimmed.indexOf("-") !== -1) return { negative: true };
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return { invalid: true };
    var value = Number(trimmed);
    if (!isFinite(value)) return { invalid: true };
    if (value < 0) return { negative: true };
    var dot = trimmed.split(".")[1];
    if (dot && dot.length > 2) return { cents: true };
    return { value: value };
  }

  function readForm() {
    var incomeState = parseMoney(document.getElementById("income").value);
    var billState = parseMoney(document.getElementById("bill-amount").value);
    var letterLang = document.getElementById("letter-lang").value;
    return {
      hospital: document.getElementById("hospital").value,
      otherName: document.getElementById("other-hospital").value.trim(),
      household: document.getElementById("household-size").value,
      incomeState: incomeState,
      income: incomeState.value,
      billState: billState,
      bill: billState.value,
      insurance: document.getElementById("insurance").value,
      billStatus: document.getElementById("bill-status").value,
      name: document.getElementById("patient-name").value.trim(),
      letterLang: letterLang === "es" ? "es" : "en"
    };
  }

  function validate(form) {
    var errors = {};
    if (!form.hospital) errors.hospital = "errors.hospital";
    if (form.hospital === "other" && !form.otherName) errors.other = "errors.other";
    if (!form.household) errors.household = "errors.household";

    if (form.incomeState.empty) errors.income = "errors.incomeRequired";
    else if (form.incomeState.negative) errors.income = "errors.incomeNegative";
    else if (form.incomeState.cents) errors.income = "errors.incomeCents";
    else if (form.incomeState.invalid || typeof form.income !== "number") errors.income = "errors.incomeNumber";

    if (form.billState.empty) errors.bill = "errors.billRequired";
    else if (form.billState.negative) errors.bill = "errors.billNegative";
    else if (form.billState.cents) errors.bill = "errors.billCents";
    else if (form.billState.invalid || typeof form.bill !== "number") errors.bill = "errors.billNumber";

    if (!form.insurance) errors.insurance = "errors.insurance";
    if (!form.billStatus) errors.billStatus = "errors.billStatus";
    return errors;
  }

  function hasErrors(errors) {
    return Object.keys(errors).length > 0;
  }

  function clearErrors() {
    state.errorKeys = {};
    applyErrors();
  }

  function showErrors(errors) {
    state.errorKeys = errors;
    applyErrors();
    var summary = document.getElementById("form-error-summary");
    var first = null;
    var i;
    for (i = 0; i < ERROR_FIELDS.length; i += 1) {
      if (errors[ERROR_FIELDS[i]]) {
        first = document.getElementById(ERROR_INPUTS[ERROR_FIELDS[i]]);
        break;
      }
    }
    if (first) first.focus();
  }

  function applyErrors() {
    var summary = document.getElementById("form-error-summary");
    var active = hasErrors(state.errorKeys);
    if (summary) {
      summary.hidden = !active;
      summary.textContent = active ? t("errors.summary") : "";
    }
    ERROR_FIELDS.forEach(function (field) {
      var node = document.getElementById(ERROR_NODES[field]);
      var input = document.getElementById(ERROR_INPUTS[field]);
      var key = state.errorKeys[field];
      if (!node || !input) return;
      if (key) {
        node.hidden = false;
        node.textContent = t(key);
        input.setAttribute("aria-invalid", "true");
      } else {
        node.hidden = true;
        node.textContent = "";
        input.removeAttribute("aria-invalid");
      }
    });
  }

  function clearFieldError(field) {
    if (!state.errorKeys[field]) return;
    delete state.errorKeys[field];
    applyErrors();
  }

  function hospitalDisplay(form, lang) {
    if (form.hospital === "other") return form.otherName.trim();
    var names = dict(lang || state.lang).form.hospital;
    return names[form.hospital] || "";
  }

  function phoneLine(policy) {
    if (!policy.contact || !policy.contact.phone) return "";
    if (policy.contact.phoneLocal) {
      return policy.contact.phone + " / " + policy.contact.phoneLocal;
    }
    return policy.contact.phone;
  }

  function pushStep(steps, key, vars) {
    steps.push(t(key, vars));
  }

  function addSharedSteps(form, policy, steps) {
    var phone = policy && policy.verificationStatus === "verified" ? phoneLine(policy) : "";
    if (phone) pushStep(steps, "steps.contactPhone", { phone: phone });
    else pushStep(steps, "steps.contactGeneric");
    pushStep(steps, "steps.documents");
    pushStep(steps, "steps.itemized");
    pushStep(steps, "steps.plan");
    if (form.insurance === "insured") pushStep(steps, "steps.insured");
    else if (form.insurance === "medicaid" || form.insurance === "medicare" || form.insurance === "unsure") {
      pushStep(steps, "steps.coverage", { insurance: t("form.insurance." + form.insurance) });
    }
    if (form.hospital === "harrisHealth") pushStep(steps, "steps.harrisCounty");
    if (form.hospital === "memorialHermann") pushStep(steps, "steps.memorialDate");
    if (form.hospital === "hcaHouston") pushStep(steps, "steps.hcaLocation");
    if (form.billStatus === "collections") pushStep(steps, "steps.collections");
    if (form.billStatus === "notYetBilled") pushStep(steps, "steps.notYet");
    if (form.billStatus === "paying") pushStep(steps, "steps.paying");
    pushStep(steps, "steps.letter");
  }

  function optionRecord(id, status, noteKey) {
    return {
      title: t("options." + id + ".title"),
      status: status,
      what: t("options." + id + ".what"),
      why: t("options." + id + ".why"),
      next: t("options." + id + ".next"),
      note: noteKey ? t(noteKey) : ""
    };
  }

  function buildOptions(form) {
    var verified = hospitalPolicies[form.hospital] && hospitalPolicies[form.hospital].verificationStatus === "verified";
    var planNote = "";
    var planStatus = "possible";
    if (form.hospital === "houstonMethodist") {
      planStatus = "confirmed";
      planNote = "options.plan.methodist";
    } else if (form.hospital === "memorialHermann") {
      planStatus = "confirmed";
      planNote = "options.plan.memorial";
    }
    var discountStatus = "possible";
    var discountNote = "";
    if (form.hospital === "hcaHouston" && form.insurance === "uninsured") {
      discountStatus = "confirmed";
      discountNote = "policy.hca.discount";
    }
    return [
      optionRecord("charity", verified ? "confirmed" : "possible", ""),
      optionRecord("discount", discountStatus, discountNote),
      optionRecord("itemized", "possible", ""),
      optionRecord("plan", planStatus, planNote),
      optionRecord("other", "unknown", verified ? "options.other.unknown" : "options.other.unverified")
    ];
  }

  /* Returns paragraphs of confirmed policy text plus a careful income comparison.
     The comparison never says the household qualifies or states a savings amount. */
  function buildPolicyParagraphs(form) {
    var policy = hospitalPolicies[form.hospital];
    var paragraphs = [];
    var size = form.household;
    var insurance = t("form.insurance." + form.insurance);
    var ratio = povertyRatio(form.income, size);
    var percent = ratio === null ? "" : formatPercent(ratio);
    var sizeText = sizeLabel(size);

    function add(key, vars) {
      paragraphs.push(t(key, vars));
    }

    if (form.hospital === "houstonMethodist") {
      var methodistBand = bandThrough(form.income, size, policy.bands.lowMax, policy.bands.midMax);
      add("policy.methodist.rules");
      if (methodistBand === "low" && size === "8plus") {
        add("policy.methodist.eightLow", { limit: formatMoney(cutoffDollars(size, 200)) });
      } else if (methodistBand === "low") {
        add("policy.methodist.low", { size: sizeText, limit: formatMoney(cutoffDollars(size, 200)) });
      } else if (methodistBand === "mid") {
        add("policy.methodist.mid", {
          size: sizeText,
          percent: percent,
          limit200: formatMoney(cutoffDollars(size, 200)),
          limit500: formatMoney(cutoffDollars(size, 500))
        });
      } else if (methodistBand === "high") {
        add("policy.methodist.above", { size: sizeText, limit: formatMoney(cutoffDollars(size, 500)) });
        if (form.income > 0 && form.bill > form.income * policy.above500BalanceShare) {
          add("policy.methodist.ten");
        }
      } else {
        add("policy.methodist.eightUnknown", {
          limit200: formatMoney(cutoffDollars("8plus", 200)),
          limit500: formatMoney(cutoffDollars("8plus", 500))
        });
      }
      if (form.insurance === "uninsured") add("policy.methodist.insUninsured");
      else if (form.insurance === "insured") add("policy.methodist.insInsured");
      else add("policy.methodist.insPublic", { insurance: insurance });
    }

    if (form.hospital === "memorialHermann") {
      var memorialBand = bandThrough(form.income, size, policy.bands.lowMax, policy.bands.midMax);
      var uninsured = form.insurance === "uninsured";
      add("policy.memorial.rules");
      if (size === "7") add("policy.memorial.size7");
      if (size === "8plus" && memorialBand === "low") {
        add(uninsured ? "policy.memorial.eightUninsuredLow" : "policy.memorial.eightOtherLow", {
          limit: formatMoney(cutoffDollars(size, 200)),
          insurance: insurance
        });
      } else if (size === "8plus") {
        add("policy.memorial.eightUnknown", {
          limit200: formatMoney(cutoffDollars("8plus", 200)),
          limit400: formatMoney(cutoffDollars("8plus", 400))
        });
      } else if (memorialBand === "low") {
        add(uninsured ? "policy.memorial.uninsuredLow" : "policy.memorial.otherLow", {
          size: sizeText,
          limit: formatMoney(cutoffDollars(size, 200)),
          insurance: insurance
        });
      } else if (memorialBand === "mid") {
        add(uninsured ? "policy.memorial.uninsuredMid" : "policy.memorial.otherMid", {
          size: sizeText,
          percent: percent,
          insurance: insurance
        });
      } else {
        add(uninsured ? "policy.memorial.uninsuredAbove" : "policy.memorial.otherAbove", {
          size: sizeText,
          limit: formatMoney(cutoffDollars(size, 400)),
          insurance: insurance
        });
      }
      if (form.insurance === "medicare") add("policy.memorial.insMedicare");
      if (form.insurance === "medicaid") add("policy.memorial.insMedicaid");
      if (form.insurance === "unsure") add("policy.memorial.insUnsure");
    }

    if (form.hospital === "harrisHealth") {
      var harrisBand = comparePercent(form.income, size, policy.bands.lowMax);
      add("policy.harris.rules");
      if (size === "8plus" && harrisBand === "atOrBelow") {
        add("policy.harris.eightLow", { limit: formatMoney(cutoffDollars(size, 150)) });
      } else if (size === "8plus") {
        add("policy.harris.eightUnknown", { limit: formatMoney(cutoffDollars(size, 150)) });
      } else if (harrisBand === "atOrBelow") {
        add("policy.harris.low", { size: sizeText, limit: formatMoney(cutoffDollars(size, 150)) });
      } else {
        add("policy.harris.above", { size: sizeText, limit: formatMoney(cutoffDollars(size, 150)) });
      }
      add("policy.harris.ins", { insurance: insurance });
    }

    if (form.hospital === "texasChildrens") {
      var tchBand = texasBand(form.income, size);
      add("policy.tch.rules");
      if (tchBand === "under250" && size === "8plus") {
        add("policy.tch.eightLow", { limit: formatMoney(cutoffDollars(size, 250)) });
      } else if (tchBand === "under250") {
        add("policy.tch.under250", { size: sizeText, percent: percent });
      } else if (tchBand === "mid") {
        add("policy.tch.mid", { size: sizeText, percent: percent });
      } else if (tchBand === "agb") {
        add("policy.tch.agb", { size: sizeText, percent: percent });
      } else if (tchBand === "above") {
        add("policy.tch.above", { size: sizeText, limit: formatMoney(cutoffDollars(size, 400)) });
      } else if (tchBand === "gap") {
        add("policy.tch.gap", { size: sizeText, percent: percent });
      } else {
        add("policy.tch.eightUnknown", { limit: formatMoney(cutoffDollars("8plus", 250)) });
      }
      if (form.insurance !== "uninsured") add("policy.tch.ins", { insurance: insurance });
    }

    if (form.hospital === "hcaHouston") {
      var hcaBand = bandThrough(form.income, size, policy.bands.lowMax, policy.bands.midMax);
      add("policy.hca.rules");
      if (hcaBand === "low" && size === "8plus") {
        add("policy.hca.eightLow", { limit: formatMoney(cutoffDollars(size, 200)) });
      } else if (hcaBand === "low") {
        add("policy.hca.low", { size: sizeText, limit: formatMoney(cutoffDollars(size, 200)) });
      } else if (hcaBand === "mid" && size !== "8plus") {
        if (form.billStatus === "notYetBilled") {
          add("policy.hca.midEstimate", { size: sizeText, bill: formatMoney(form.bill) });
        } else if (form.bill > policy.expandedBalanceMinimum) {
          add("policy.hca.midOver", { size: sizeText, percent: percent, bill: formatMoney(form.bill) });
        } else {
          add("policy.hca.midUnder", { size: sizeText, percent: percent, bill: formatMoney(form.bill) });
        }
      } else if (hcaBand === "high") {
        add("policy.hca.above", { size: sizeText, limit: formatMoney(cutoffDollars(size, 400)) });
      } else {
        add("policy.hca.eightUnknown", {
          limit200: formatMoney(cutoffDollars("8plus", 200)),
          limit400: formatMoney(cutoffDollars("8plus", 400))
        });
      }
      if (form.insurance !== "uninsured") add("policy.hca.insPublic", { insurance: insurance });
      if (form.insurance === "uninsured") add("policy.hca.discount");
    }

    return paragraphs;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderResults(form) {
    var root = document.getElementById("results-root");
    var policy = hospitalPolicies[form.hospital];
    var verified = policy && policy.verificationStatus === "verified";
    root.textContent = "";

    root.appendChild(el("p", "banner banner-unknown", t("results.unknownBanner")));
    root.appendChild(el("p", "disclaimer", t("results.disclaimer")));

    if (!verified) {
      root.appendChild(el("p", "banner banner-unverified", t("results.unverified")));
    }

    var summarySection = el("section", "section-block");
    summarySection.appendChild(el("h2", null, t("results.summaryTitle")));
    var dl = document.createElement("dl");
    dl.className = "summary";
    [
      ["results.hospital", hospitalDisplay(form)],
      ["results.household", sizeLabel(form.household)],
      ["results.income", formatMoney(form.income)],
      ["results.bill", formatMoney(form.bill)],
      ["results.insurance", t("form.insurance." + form.insurance)],
      ["results.billStatus", t("form.billStatus." + form.billStatus)]
    ].forEach(function (pair) {
      var wrap = document.createElement("div");
      wrap.appendChild(el("dt", null, t(pair[0])));
      wrap.appendChild(el("dd", null, pair[1]));
      dl.appendChild(wrap);
    });
    summarySection.appendChild(dl);
    root.appendChild(summarySection);

    if (verified) {
      var policySection = el("section", "section-block");
      policySection.appendChild(el("h2", null, t("results.confirmedHeading")));
      var policyCard = el("div", "card policy-block");
      policyCard.appendChild(el("span", "chip chip-confirmed", t("results.status.confirmed")));
      buildPolicyParagraphs(form).forEach(function (text) {
        policyCard.appendChild(el("p", null, text));
      });
      policyCard.appendChild(el("p", null, t("results.notADecision")));
      policyCard.appendChild(el("p", "checked", t("results.fplNote")));
      var list = document.createElement("ul");
      list.className = "source-list";
      policy.sources.forEach(function (source) {
        list.appendChild(sourceLink(source.url, t(source.labelKey)));
      });
      list.appendChild(sourceLink(FPL_URL, t("sources.fpl")));
      policyCard.appendChild(list);
      policyCard.appendChild(el("p", "checked", t("results.checked")));
      policySection.appendChild(policyCard);
      root.appendChild(policySection);
    }

    var optionsSection = el("section", "section-block");
    optionsSection.appendChild(el("h2", null, t("results.optionsHeading")));
    buildOptions(form).forEach(function (option) {
      var card = el("article", "card option-card");
      card.appendChild(el("span", "chip chip-" + option.status, t("results.status." + option.status)));
      card.appendChild(el("h3", null, option.title));
      card.appendChild(el("h4", null, t("results.what")));
      card.appendChild(el("p", null, option.what));
      card.appendChild(el("h4", null, t("results.why")));
      card.appendChild(el("p", null, option.why));
      card.appendChild(el("h4", null, t("results.next")));
      card.appendChild(el("p", null, option.next));
      if (option.note) card.appendChild(el("p", null, option.note));
      optionsSection.appendChild(card);
    });
    root.appendChild(optionsSection);

    var stepsSection = el("section", "section-block");
    stepsSection.appendChild(el("h2", null, t("results.stepsHeading")));
    var ol = document.createElement("ol");
    ol.className = "steps-list";
    var steps = [];
    addSharedSteps(form, policy, steps);
    steps.forEach(function (text) {
      ol.appendChild(el("li", null, text));
    });
    stepsSection.appendChild(ol);
    root.appendChild(stepsSection);
  }

  function sourceLink(href, label) {
    var item = document.createElement("li");
    var link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    var hint = el("span", "visually-hidden", " (" + t("results.newTab") + ")");
    item.appendChild(link);
    item.appendChild(hint);
    return item;
  }

  function letterSignature(form) {
    return [
      form.hospital,
      form.otherName,
      form.household,
      form.income,
      form.bill,
      form.billStatus,
      form.name
    ].join("|");
  }

  function buildLetter(form) {
    var lang = form.letterLang === "es" ? "es" : "en";
    var pack = dict(lang);
    var template = pack.letterTemplate;
    var size = form.household === "8plus" ? pack.form.household.eightPlus : form.household;
    var vars = {
      size: size,
      income: formatMoney(form.income),
      bill: formatMoney(form.bill)
    };
    var householdLine = form.billStatus === "notYetBilled" ? template.householdExpected : template.householdCurrent;
    var lines = [
      template.department,
      hospitalDisplay(form, lang),
      "",
      template.greeting,
      "",
      template.intro,
      "",
      fill(householdLine, vars)
    ];
    if (form.billStatus === "collections") lines.push(template.collections);
    if (form.billStatus === "paying") lines.push(template.paying);
    if (form.billStatus === "notYetBilled") lines.push(template.notYet);
    lines.push(
      "",
      template.docs,
      "",
      template.collectionsAsk,
      "",
      template.confirm,
      "",
      template.thanks,
      "",
      template.closing,
      form.name ? form.name : template.blankName
    );
    return lines.join("\n");
  }

  function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  function writeLetter(form) {
    var text = buildLetter(form);
    var area = document.getElementById("letter-text");
    area.value = text;
    area.lang = form.letterLang;
    state.letterBaseline = text;
    state.letterEdited = false;
    state.letterGenerated = true;
    state.letterSignature = letterSignature(form);
    state.letterSourceLang = form.letterLang;
    document.getElementById("letter-copy-status").textContent = "";
    document.getElementById("letter-copy-status").classList.remove("is-error");
    updateLetterNotes(form);
  }

  function updateLetterNotes(form) {
    var note = document.getElementById("letter-lang-note");
    var stale = document.getElementById("letter-stale");
    if (!state.letterGenerated) {
      note.textContent = "";
      stale.hidden = true;
      stale.textContent = "";
      return;
    }
    note.textContent = t("letter.langNote", {
      language: t("letter.langName." + state.letterSourceLang)
    });
    var messages = [];
    var valid = !hasErrors(validate(form));
    if (valid && form.letterLang !== state.letterSourceLang) messages.push(t("letter.staleLang"));
    if (valid && letterSignature(form) !== state.letterSignature) messages.push(t("letter.staleAnswers"));
    stale.hidden = messages.length === 0;
    stale.textContent = messages.join(" ");
  }

  function openLetter(forceNew) {
    var form = readForm();
    var errors = validate(form);
    if (hasErrors(errors)) {
      showErrors(errors);
      showScreen("form");
      return;
    }
    clearErrors();
    if (forceNew) {
      if (state.letterEdited && !window.confirm(t("letter.refreshConfirm"))) return;
      writeLetter(form);
    } else if (!state.letterGenerated) {
      writeLetter(form);
    } else {
      updateLetterNotes(form);
    }
    showScreen("letter");
  }

  function refreshLetter() {
    var form = readForm();
    var errors = validate(form);
    if (hasErrors(errors)) {
      showErrors(errors);
      showScreen("form");
      return;
    }
    if (state.letterEdited && !window.confirm(t("letter.refreshConfirm"))) return;
    writeLetter(form);
  }

  function copyLetter() {
    var area = document.getElementById("letter-text");
    var status = document.getElementById("letter-copy-status");
    var text = area.value;

    function show(ok) {
      status.classList.toggle("is-error", !ok);
      status.textContent = ok ? t("letter.copied") : t("letter.copyFail");
      if (!ok) {
        area.focus();
        area.select();
      }
    }

    /* Run during the click. A later fallback loses the browser's permission to copy. */
    function legacyCopy() {
      var helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.top = "0";
      helper.style.left = "0";
      helper.style.width = "2em";
      helper.style.height = "2em";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.focus();
      helper.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(helper);
      return ok;
    }

    var legacyOk = legacyCopy();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        show(true);
      }).catch(function () {
        show(legacyOk);
      });
      return;
    }
    show(legacyOk);
  }

  function showScreen(name, options) {
    options = options || {};
    state.screen = name;
    document.querySelectorAll(".screen").forEach(function (section) {
      section.hidden = section.id !== "screen-" + name;
    });
    updateNav();
    var heading = document.querySelector("#screen-" + name + " h1");
    if (heading && !options.skipFocus) {
      heading.focus({ preventScroll: true });
    }
    var header = document.querySelector(".site-header");
    var offset = header ? header.offsetHeight + 16 : 16;
    var top = 0;
    if (heading) {
      top = heading.getBoundingClientRect().top + window.pageYOffset - offset;
    }
    window.scrollTo(0, Math.max(0, top));
  }

  function openResults() {
    var form = readForm();
    var errors = validate(form);
    if (hasErrors(errors)) {
      showErrors(errors);
      showScreen("form");
      return;
    }
    clearErrors();
    renderResults(form);
    showScreen("results");
  }

  function startOver() {
    document.getElementById("family-form").reset();
    document.getElementById("other-hospital-field").hidden = true;
    document.getElementById("letter-text").value = "";
    document.getElementById("letter-copy-status").textContent = "";
    document.getElementById("letter-copy-status").classList.remove("is-error");
    document.getElementById("letter-stale").hidden = true;
    document.getElementById("letter-lang-note").textContent = "";
    document.getElementById("results-root").textContent = "";
    state.submitted = false;
    state.letterGenerated = false;
    state.letterEdited = false;
    state.letterBaseline = "";
    state.letterSignature = "";
    state.letterSourceLang = "en";
    clearErrors();
    showScreen("home");
  }

  function onNav(target) {
    if ((target === "results" || target === "letter") && !state.submitted) return;
    if (target === "home") {
      showScreen("home");
      return;
    }
    if (target === "form") {
      showScreen("form");
      return;
    }
    if (target === "results") openResults();
    if (target === "letter") openLetter(false);
  }

  function updateNav() {
    var locked = !state.submitted;
    var resultsBtn = document.getElementById("nav-results");
    var letterBtn = document.getElementById("nav-letter");
    resultsBtn.disabled = locked;
    letterBtn.disabled = locked;
    resultsBtn.setAttribute("aria-label", locked ? t("nav.resultsLocked") : t("nav.results"));
    letterBtn.setAttribute("aria-label", locked ? t("nav.letterLocked") : t("nav.letter"));
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      var current = btn.getAttribute("data-nav") === state.screen;
      btn.classList.toggle("is-current", current);
      if (current) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function applyStaticText() {
    document.documentElement.lang = state.lang;
    document.title = t("meta.title");
    var description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("meta.description"));
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      var value = t(node.getAttribute("data-i18n"));
      if (value !== node.getAttribute("data-i18n")) node.textContent = value;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
      node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria")));
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (node) {
      node.alt = t(node.getAttribute("data-i18n-alt"));
    });
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === state.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    applyErrors();
    updateNav();
  }

  function setLanguage(lang) {
    if (lang !== "en" && lang !== "es" || lang === state.lang) return;
    state.lang = lang;
    applyStaticText();
    if (state.screen === "results" && state.submitted) {
      var form = readForm();
      if (!hasErrors(validate(form))) renderResults(form);
    }
    if (state.screen === "letter") updateLetterNotes(readForm());
  }

  function fieldFromTarget(target) {
    var id = target.id;
    if (id === "hospital") return "hospital";
    if (id === "other-hospital") return "other";
    if (id === "household-size") return "household";
    if (id === "income") return "income";
    if (id === "bill-amount") return "bill";
    if (id === "insurance") return "insurance";
    if (id === "bill-status") return "billStatus";
    return "";
  }

  function bindEvents() {
    document.querySelectorAll("[data-nav]").forEach(function (node) {
      node.addEventListener("click", function (event) {
        event.preventDefault();
        onNav(node.getAttribute("data-nav"));
      });
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLanguage(btn.getAttribute("data-lang"));
      });
    });

    document.getElementById("hospital").addEventListener("change", function (event) {
      document.getElementById("other-hospital-field").hidden = event.target.value !== "other";
      if (event.target.value !== "other") clearFieldError("other");
    });

    ["income", "bill-amount"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function (event) {
        var cleaned = sanitizeMoney(event.target.value);
        if (cleaned !== event.target.value) event.target.value = cleaned;
      });
    });

    document.getElementById("family-form").addEventListener("input", function (event) {
      var field = fieldFromTarget(event.target);
      if (field) clearFieldError(field);
    });
    document.getElementById("family-form").addEventListener("change", function (event) {
      var field = fieldFromTarget(event.target);
      if (field) clearFieldError(field);
    });

    document.getElementById("family-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = readForm();
      var errors = validate(form);
      if (hasErrors(errors)) {
        showErrors(errors);
        return;
      }
      clearErrors();
      state.submitted = true;
      updateNav();
      renderResults(form);
      showScreen("results");
    });

    document.getElementById("btn-generate").addEventListener("click", function () {
      openLetter(true);
    });
    document.getElementById("btn-edit").addEventListener("click", function () {
      showScreen("form");
    });
    document.getElementById("btn-start-over").addEventListener("click", startOver);
    document.getElementById("btn-copy").addEventListener("click", copyLetter);
    document.getElementById("btn-refresh").addEventListener("click", refreshLetter);
    document.getElementById("btn-back").addEventListener("click", function () {
      openResults();
    });

    document.getElementById("letter-text").addEventListener("input", function (event) {
      state.letterEdited = state.letterGenerated && event.target.value !== state.letterBaseline;
      var status = document.getElementById("letter-copy-status");
      status.textContent = "";
      status.classList.remove("is-error");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    applyStaticText();
    showScreen("home", { skipFocus: true });
  });
})();
