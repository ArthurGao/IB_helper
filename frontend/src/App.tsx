import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Compare from './pages/Compare'
import Considerations from './pages/Considerations'
import Glossary from './pages/Glossary'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Ncea from './pages/Ncea'
import NceaCalculator from './pages/NceaCalculator'
import NceaChanges from './pages/NceaChanges'
import NceaHowItWorks from './pages/NceaHowItWorks'
import NceaUniversity from './pages/NceaUniversity'
import NceaWhichOne from './pages/NceaWhichOne'
import NZ from './pages/NZ'
import Selector from './pages/Selector'
import Updates from './pages/Updates'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="learn" element={<Learn />} />
          <Route path="learn/considerations" element={<Considerations />} />
          <Route path="selector" element={<Selector />} />
          <Route path="compare" element={<Compare />} />
          <Route path="ncea" element={<Ncea />} />
          <Route path="ncea/how-it-works" element={<NceaHowItWorks />} />
          <Route path="ncea/university" element={<NceaUniversity />} />
          <Route path="ncea/calculator" element={<NceaCalculator />} />
          <Route path="ncea/changes" element={<NceaChanges />} />
          <Route path="ncea/which-one" element={<NceaWhichOne />} />
          <Route path="nz" element={<NZ />} />
          <Route path="glossary" element={<Glossary />} />
          <Route path="updates" element={<Updates />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
