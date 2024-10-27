"use client";
import React from 'react'
import Heading from '../utils/Heading';
import AdminSidebar from "../components/Admin/sidebar/AdminSidebar";
import AdminProtected from '../hooks/adminProtected';
type Props = {}

const page = (props: Props) => {
  return (
    <div>
        <AdminProtected>
        <Heading
          title="EduVista - Admin"
          description="Empowering Students, Connecting Educators"
          keywords="Programming,MERN,Redux,Machine Learning, eLearning, Online Courses, Distance Learning, Educational Resources, Learning Management System (LMS), Study Material, Programming Courses, Mathematics Tutorials, Language Learning, Science Education, Arts and Humanities Courses, Student Platform, Virtual Classroom, Learning Community, Course Catalog"
        />
        <div className="flex h-[200vh]">
            <div className="1500px:w-[16%] w-1/5">
                <AdminSidebar/>
            </div>
            <div className="w-[85%]"></div>
        </div>
        </AdminProtected>
    </div>
  )
}

export default page