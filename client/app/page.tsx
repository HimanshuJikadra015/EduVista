"use client";
import React, { FC, useState } from "react";
import Heading from "./utils/Heading";
import Header from "./components/Header";
import Hero from "./components/route/Hero";
interface Props {}

const Page: FC<Props> = (props) => {
  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(0);
  return (
    <div>
      <Heading
        title="EduVista"
        description="Empowering Students, Connecting Educators"
        keywords="Programming,MERN,Redux,Machine Learning, eLearning, Online Courses, Distance Learning, Educational Resources, Learning Management System (LMS), Study Material, Programming Courses, Mathematics Tutorials, Language Learning, Science Education, Arts and Humanities Courses, Student Platform, Virtual Classroom, Learning Community, Course Catalog"
      />
      <Header open={open} setOpen={setOpen} activeItem={activeItem} />
      <Hero />
    </div>
  );
};

export default Page;
