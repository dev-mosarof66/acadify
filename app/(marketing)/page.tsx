import Hero from '@/components/landing/hero'
import InstitutesStrip from '@/components/landing/institutes-strip'
import Modules from '@/components/landing/modules'
import Automations from '@/components/landing/automations'
import Institutions from '@/components/landing/institutions'
import AcademicHub from '@/components/landing/academic-hub'
import CtaBand from '@/components/landing/cta-section'
import Pricing from '@/components/landing/pricing-section'
import WhyAcadify from '@/components/landing/why-acadify'
import Results from '@/components/landing/results'
import Faq from '@/components/landing/faq-section'
import React from 'react'

const page = () => {
  return (
    <>
      <Hero />
      <InstitutesStrip />
      <Modules />
      <Automations />
      <Institutions />
      <AcademicHub />
      <CtaBand />
      <Pricing />
      <WhyAcadify />
      <Results />
      <Faq />
    </>
  )
}

export default page
