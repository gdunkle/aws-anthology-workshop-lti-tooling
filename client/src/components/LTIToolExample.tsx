import React from 'react';
import { Formik, Form, FormikHelpers, Field, ErrorMessage } from 'formik';
import './LTIToolExample.css';

interface Values {
  kCheckOauth: boolean;
  kCheckREST: boolean;
  kCheckGradeReturn: boolean;
}

const LTIToolExample = () => {
  return (
    <div className="form-container">
      <h1>LTI Tool Example</h1>
      <h3>Knowledge Check</h3>
      <Formik
        initialValues={{
          kCheckOauth: false,
          kCheckREST: false,
          kCheckGradeReturn: false
        }}
        onSubmit={(
          values: Values,
          { setSubmitting }: FormikHelpers<Values>
        ) => {
          setTimeout(() => {
            alert(JSON.stringify(values, null, 2));
            setSubmitting(false);
          }, 500);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <div className="form-group">
            <Field type="checkbox" id="ackOauth" name="ackOauth" /><label htmlFor="ackOauth">I acknowledge that I have learned the concepts of OAuth with regards to API access.</label>
            <ErrorMessage name="ackOauth" component="div" />
            </div>
            <div className="form-group">
            <Field type="checkbox" id="ackREST" name="ackREST" />
            <label htmlFor="ackREST">I acknowledge that I have learned the concepts of REST APIs.</label>
            <ErrorMessage name="ackREST" component="div" />
            </div>
            <div className="form-group">
            <Field type="checkbox" id="ackGradeReturn" name="ackGradeReturn" />
            <label htmlFor="ackGradeReturn">I acknowledge that I have learned the concepts of LTI Grade Return.</label>
            <ErrorMessage name="ackGradeReturn" component="div" />
            </div>
            <button type="submit" disabled={isSubmitting}>
              Submit
            </button>
          </Form>
        )}
      </Formik>
    </div>
  )
};

export default LTIToolExample;